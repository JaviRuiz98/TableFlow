import { Injectable } from '@angular/core';
import { ErrorMessageService, SupabaseService } from '../../../core/infrastructure';
import type { Role } from '../../../core/models/models';

export interface CreateUserRequest {
  full_name: string;
  username: string;
  password: string;
  role: Role;
  /** Required outside onboarding; Edge re-checks via verify_app_secret when present. */
  admin_password?: string;
}

@Injectable({ providedIn: 'root' })
export class UserAdminService {
  constructor(
    private readonly db: SupabaseService,
    private readonly errors: ErrorMessageService,
  ) {}

  async verifyAccess(password: string): Promise<boolean> {
    const { data, error } = await this.db.client.rpc('verify_app_secret', {
      p_key: 'user_management',
      p_secret: password,
    });

    if (error) throw new Error(this.errors.humanize(error, 'No se pudo verificar la contraseña'));
    return data === true;
  }

  /**
   * Counts company members other than the current admin (onboarding step 3).
   * With `company_id`, scopes to that tenant; without it (legacy), counts any other visible profile.
   */
  async countAdditionalCompanyUsers(params: {
    companyId: string | null | undefined;
    currentUserId: string;
  }): Promise<number> {
    let query = this.db.client
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .neq('id', params.currentUserId)
      .eq('role', 'USER');

    if (params.companyId) {
      query = query.eq('company_id', params.companyId);
    }

    const { count, error } = await query;
    if (error) throw new Error(this.errors.humanize(error, 'No se pudo consultar el personal'));
    return count ?? 0;
  }

  async createUser(request: CreateUserRequest): Promise<void> {
    const {
      data: { session },
    } = await this.db.client.auth.getSession();

    if (!session?.access_token) {
      throw new Error('La sesión ha caducado. Cierra sesión y vuelve a entrar.');
    }

    const { data, error } = await this.db.client.functions.invoke('create-user', {
      body: request,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      let detail = error.message;
      const context = (error as { context?: Response }).context;
      if (context && typeof context.clone === 'function') {
        try {
          const payload = await context.clone().json() as { error?: string; message?: string; detail?: string };
          detail = payload.error ?? payload.message ?? payload.detail ?? detail;
        } catch {
          // Conservamos el mensaje original si la respuesta no es JSON.
        }
      }
      const normalized = detail.toLowerCase();
      if (
        normalized.includes('failed to send a request to the edge function') ||
        normalized.includes('cors') ||
        normalized.includes('failed to fetch')
      ) {
        throw new Error(
          'No se pudo contactar la función create-user (CORS/preflight). Redespliégala en TableFlow con verify_jwt desactivado: supabase/functions/create-user.',
        );
      }
      if (normalized.includes('faltan datos obligatorios') || normalized.includes('completa todos los campos obligatorios')) {
        throw new Error(
          'La función create-user desplegada en Supabase está desactualizada. Actualízala con supabase/functions/create-user/index.ts de este proyecto.',
        );
      }
      throw new Error(this.errors.humanize(detail, 'No se pudo crear el usuario'));
    }

    if (data?.error) {
      throw new Error(this.errors.humanize(data.error, 'No se pudo crear el usuario'));
    }

    if (!data?.success) {
      throw new Error('El servidor no confirmó la creación del usuario.');
    }
  }
}
