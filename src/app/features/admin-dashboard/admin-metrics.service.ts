import { Injectable } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { ErrorMessageService, SupabaseService } from '../../core/infrastructure';
import { ProductService } from '../products';
import { UserAdminService } from '../users';
import type { Role } from '../../core/models/models';
import { AdminCompanyContextService } from './admin-company-context.service';

export type MetricAvailability = 'ready' | 'unavailable' | 'empty' | 'error';

export interface AdminMetric<T = number> {
  availability: MetricAvailability;
  value: T | null;
  /** User-facing detail only — never schema/RLS jargon. */
  detail?: string;
}

export interface AdminStaffRow {
  id: string;
  full_name: string | null;
  username: string | null;
  role: Role;
  phone: string | null;
}

export interface AdminCompanyInfo {
  id: string;
  name: string;
}

export interface AdminOverviewSnapshot {
  company: AdminMetric<AdminCompanyInfo>;
  tablesConfigured: AdminMetric;
  pendingOrders: AdminMetric;
  activeProducts: AdminMetric;
  workers: AdminMetric;
  staff: AdminMetric<AdminStaffRow[]>;
  activityAvailable: boolean;
}

/**
 * Tenant-scoped ADMIN overview metrics.
 * Never queries across companies. Marks KPIs unavailable when schema lacks company_id.
 */
@Injectable({ providedIn: 'root' })
export class AdminMetricsService {
  constructor(
    private readonly auth: AuthService,
    private readonly db: SupabaseService,
    private readonly products: ProductService,
    private readonly users: UserAdminService,
    private readonly companyCtx: AdminCompanyContextService,
    private readonly errors: ErrorMessageService,
  ) {}

  async loadOverview(): Promise<AdminOverviewSnapshot> {
    await this.auth.whenReady();
    const profile = this.auth.profile();
    const companyId = profile?.company_id ?? null;

    if (!companyId) {
      const missing: AdminMetric = {
        availability: 'unavailable',
        value: null,
        detail: 'No hay una empresa asociada a tu cuenta.',
      };
      return {
        company: { availability: 'unavailable', value: null, detail: missing.detail },
        tablesConfigured: missing,
        pendingOrders: missing,
        activeProducts: missing,
        workers: missing,
        staff: { availability: 'unavailable', value: null, detail: missing.detail },
        activityAvailable: false,
      };
    }

    const [company, activeProducts, workers, staff] = await Promise.all([
      this.loadCompany(companyId),
      this.loadActiveProducts(),
      this.loadWorkerCount(companyId, profile!.id),
      this.loadStaff(companyId),
    ]);

    if (company.availability === 'ready' && company.value) {
      this.companyCtx.setCompany(company.value.id, company.value.name);
    }

    return {
      company,
      // Safe UX placeholders until tenant isolation lands for tables/orders (see docs).
      tablesConfigured: {
        availability: 'ready',
        value: 0,
        detail: 'No hay aún mesas o reservados disponibles.',
      },
      pendingOrders: {
        availability: 'ready',
        value: 0,
        detail: 'No hay aún pedidos pendientes disponibles.',
      },
      activeProducts,
      workers,
      staff,
      activityAvailable: false,
    };
  }

  /**
   * Updates commercial name for the ADMIN's own company only.
   * Relies on RLS `companies_admin_update_onboarding` (0020) scoped to caller company_id.
   * Prefer RPC `update_own_company_name` when migration 0023 is applied.
   */
  async updateCompanyName(name: string): Promise<string> {
    await this.auth.whenReady();
    if (!this.auth.hasRole('ADMIN')) {
      throw new Error('Solo un administrador puede cambiar el nombre comercial.');
    }
    const companyId = this.auth.profile()?.company_id;
    if (!companyId) {
      throw new Error('No hay una empresa asociada a tu cuenta.');
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new Error('Introduce un nombre comercial de al menos 2 caracteres.');
    }
    if (trimmed.length > 80) {
      throw new Error('El nombre comercial no puede superar 80 caracteres.');
    }

    const { data: rpcData, error: rpcError } = await this.db.client.rpc('update_own_company_name', {
      p_name: trimmed,
    });

    if (!rpcError && typeof rpcData === 'string' && rpcData.length) {
      this.companyCtx.setCompany(companyId, rpcData);
      return rpcData;
    }

    // Fallback: direct update if RPC not deployed yet (still RLS-scoped).
    if (rpcError && !this.isMissingRpc(rpcError.message)) {
      throw new Error(this.errors.humanize(rpcError, 'No se pudo guardar el nombre comercial'));
    }

    const { data, error } = await this.db.client
      .from('companies')
      .update({ name: trimmed })
      .eq('id', companyId)
      .select('name')
      .single();

    if (error) {
      throw new Error(this.errors.humanize(error, 'No se pudo guardar el nombre comercial'));
    }
    const saved = data?.name?.trim() || trimmed;
    this.companyCtx.setCompany(companyId, saved);
    return saved;
  }

  /**
   * Updates the signed-in ADMIN's full_name + phone only (own row).
   * Prefer RPC `update_own_admin_profile` (0025); fallback to RLS-scoped profiles UPDATE.
   */
  async updateOwnAdminProfile(input: {
    fullName: string;
    phone: string;
  }): Promise<{ fullName: string; phone: string }> {
    await this.auth.whenReady();
    if (!this.auth.hasRole('ADMIN')) {
      throw new Error('Solo un administrador puede editar estos datos.');
    }
    const userId = this.auth.session()?.user?.id ?? this.auth.profile()?.id;
    if (!userId) {
      throw new Error('No hay una sesión activa.');
    }

    const fullName = input.fullName.trim();
    const phone = input.phone.trim();
    if (fullName.length < 2) {
      throw new Error('Introduce un nombre de al menos 2 caracteres.');
    }
    if (fullName.length > 80) {
      throw new Error('El nombre no puede superar 80 caracteres.');
    }
    if (phone.length < 7 || phone.length > 30 || !/^[+\d\s().-]{7,30}$/.test(phone)) {
      throw new Error('Introduce un teléfono de contacto válido.');
    }

    const { data: rpcData, error: rpcError } = await this.db.client.rpc('update_own_admin_profile', {
      p_full_name: fullName,
      p_phone: phone,
    });

    if (!rpcError && rpcData && typeof rpcData === 'object') {
      const row = rpcData as { full_name?: string; phone?: string };
      const savedName = row.full_name?.trim() || fullName;
      const savedPhone = row.phone?.trim() || phone;
      await this.auth.refreshProfile();
      return { fullName: savedName, phone: savedPhone };
    }

    if (rpcError && !this.isMissingRpc(rpcError.message, 'update_own_admin_profile')) {
      throw new Error(this.errors.humanize(rpcError, 'No se pudieron guardar los datos del administrador'));
    }

    const { data, error } = await this.db.client
      .from('profiles')
      .update({ full_name: fullName, phone })
      .eq('id', userId)
      .select('full_name, phone')
      .single();

    if (error) {
      throw new Error(this.errors.humanize(error, 'No se pudieron guardar los datos del administrador'));
    }

    await this.auth.refreshProfile();
    return {
      fullName: data?.full_name?.trim() || fullName,
      phone: data?.phone?.trim() || phone,
    };
  }

  private isMissingRpc(message: string, rpcName = 'update_own_company_name'): boolean {
    const t = message.toLowerCase();
    return t.includes('could not find the function') || t.includes(rpcName.toLowerCase());
  }

  private async loadCompany(companyId: string): Promise<AdminMetric<AdminCompanyInfo>> {
    const { data, error } = await this.db.client
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .maybeSingle();

    if (error) {
      return { availability: 'error', value: null, detail: 'No se pudo cargar la empresa.' };
    }
    if (!data) {
      return {
        availability: 'unavailable',
        value: null,
        detail: 'No se encontró la empresa asociada a tu cuenta.',
      };
    }
    return { availability: 'ready', value: { id: data.id, name: data.name } };
  }

  private async loadActiveProducts(): Promise<AdminMetric> {
    try {
      const list = await this.products.products();
      return {
        availability: 'ready',
        value: list.length,
        detail: list.length === 0 ? 'No hay aún productos activos.' : undefined,
      };
    } catch {
      return {
        availability: 'error',
        value: null,
        detail: 'No se pudieron cargar los productos.',
      };
    }
  }

  private async loadWorkerCount(companyId: string, currentUserId: string): Promise<AdminMetric> {
    try {
      const count = await this.users.countAdditionalCompanyUsers({
        companyId,
        currentUserId,
      });
      const total = count + 1;
      return {
        availability: 'ready',
        value: total,
        detail: total <= 1 ? 'Aún no has añadido personal adicional.' : undefined,
      };
    } catch {
      return {
        availability: 'error',
        value: null,
        detail: 'No se pudo cargar el personal.',
      };
    }
  }

  private async loadStaff(companyId: string): Promise<AdminMetric<AdminStaffRow[]>> {
    const { data, error } = await this.db.client
      .from('profiles')
      .select('id, full_name, username, role, phone')
      .eq('company_id', companyId)
      .order('full_name', { ascending: true, nullsFirst: false });

    if (error) {
      return { availability: 'error', value: null, detail: 'No se pudo cargar el personal.' };
    }
    const rows = (data ?? []) as AdminStaffRow[];
    return {
      availability: rows.length ? 'ready' : 'empty',
      value: rows,
      detail: rows.length ? undefined : 'Todavía no hay trabajadores registrados.',
    };
  }
}
