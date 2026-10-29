import { Injectable } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { ErrorMessageService, SupabaseService } from '../../core/infrastructure';
import type { JornadaStatus, OrderStatus, Role } from '../../core/models/models';
import { ProductService } from '../products';
import { UserAdminService } from '../users';
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

export type MetricsScopeKind = 'jornada' | 'last7' | 'last30' | 'custom';

export interface MetricsScope {
  kind: MetricsScopeKind;
  /** Required when kind === 'jornada' and auto-select is not desired. */
  jornadaId?: string | null;
  /** YYYY-MM-DD inclusive — custom range. */
  from?: string | null;
  /** YYYY-MM-DD inclusive — custom range. */
  to?: string | null;
}

export interface JornadaSummary {
  id: string;
  name: string;
  opening_date: string;
  opens_at: string;
  closes_at: string;
  closes_next_day: boolean;
  status: JornadaStatus;
}

export interface RatioMetric {
  numerator: number;
  denominator: number;
}

/** Operational table/reserved row used for jornada KPI ratios. */
interface TableFlagRow {
  reserved: boolean;
  attended: boolean;
  /** Red on the map: bottle ordered (PENDING) and mesa not attended. */
  hasPendingBottle: boolean;
}

export interface AperturasBreakdown {
  scheduled: number;
  open: number;
  closed: number;
  total: number;
}

/** Daily billing point for period charts (grouped by jornada opening_date). */
export interface FacturacionPoint {
  date: string;
  amount: number;
}

/** Product line in the live jornada sales balance. */
export interface JornadaBalanceRow {
  productId: string;
  productName: string;
  quantity: number;
  amount: number;
}

export interface SingleJornadaKpis {
  /** reserved=true / total mesas+reservados. */
  reservas: AdminMetric<RatioMetric>;
  /** attended=true (verde / botella puesta) / total. */
  atendidas: AdminMetric<RatioMetric>;
  /** Mesas/reservados en rojo: pedido PENDING y aún no atendidos. */
  pedidosPendientes: AdminMetric;
  /** Sin reserva ni atención (capacidad libre) / total. */
  libres: AdminMetric<RatioMetric>;
  /** Running total sold (OPEN+CLOSED items, excluding CANCELLED). */
  facturacion: AdminMetric;
  balanceRows: AdminMetric<JornadaBalanceRow[]>;
}

export interface PeriodKpis {
  aperturas: AdminMetric<AperturasBreakdown>;
  /** Reservas only on open/closed jornadas in range (never future scheduled as historical). */
  reservas: AdminMetric<RatioMetric>;
  pedidosRecibidos: AdminMetric;
  pedidosAtendidos: AdminMetric;
  /** Sum of item totals on historical jornadas in range. */
  facturacion: AdminMetric;
  /** Dense daily series (zeros for days without sales). */
  facturacionSeries: AdminMetric<FacturacionPoint[]>;
}

/** Operational badge in Actividad (aligned with floor colors, not raw order.status). */
export type ActivityDisplayStatus = 'PENDIENTE' | 'ATENDIDO' | 'RESERVADA';

export interface ActivityItem {
  id: string;
  /** Raw order status (OPEN/CLOSED/…). */
  status: OrderStatus;
  /**
   * UI badge:
   * - ATENDIDO: mesa `attended` o pedido CLOSED (verde)
   * - PENDIENTE: pedido OPEN sin atender (rojo)
   * - RESERVADA: reserved sin pedido pendiente ni atención (dorado)
   */
  displayStatus: ActivityDisplayStatus;
  created_at: string;
  table_number: number | null;
  /** TABLE | RESERVED — for activity labels. */
  table_type?: 'TABLE' | 'RESERVED' | null;
  table_reserved?: boolean;
  table_attended?: boolean;
  floor_plan_id: string;
  floor_plan_name: string | null;
}

export interface AdminOverviewSnapshot {
  company: AdminMetric<AdminCompanyInfo>;
  activeProducts: AdminMetric;
  workers: AdminMetric;
  staff: AdminMetric<AdminStaffRow[]>;

  jornadas: AdminMetric<JornadaSummary[]>;
  /** Resolved scope after auto-select / period defaults. */
  scope: MetricsScope;
  selectedJornada: JornadaSummary | null;
  /** True when the tenant has no jornadas — show empty CTA. */
  emptyCta: boolean;
  mode: 'jornada' | 'period' | 'empty';

  jornadaKpis: SingleJornadaKpis | null;
  periodKpis: PeriodKpis | null;

  upcomingOpenings: AdminMetric<JornadaSummary[]>;
  recentActivity: AdminMetric<ActivityItem[]>;
}

interface DateRange {
  from: string;
  to: string;
}

interface SalesLine {
  openingDate: string;
  productId: string;
  productName: string;
  quantity: number;
  amount: number;
}

/**
 * Tenant-scoped ADMIN overview metrics around jornadas (floor_plans).
 * Never queries across companies. Marks KPIs error/unavailable on failures — never fake zeros.
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

  async loadOverview(requested: MetricsScope = { kind: 'jornada' }): Promise<AdminOverviewSnapshot> {
    await this.auth.whenReady();
    const profile = this.auth.profile();
    const companyId = profile?.company_id ?? null;

    if (!companyId) {
      return this.emptySnapshot('No hay una empresa asociada a tu cuenta.', requested);
    }

    const [company, activeProducts, workers, staff, jornadasMetric] = await Promise.all([
      this.loadCompany(companyId),
      this.loadActiveProducts(),
      this.loadWorkerCount(companyId, profile!.id),
      this.loadStaff(companyId),
      this.loadJornadas(companyId),
    ]);

    if (company.availability === 'ready' && company.value) {
      this.companyCtx.setCompany(company.value.id, company.value.name);
    }

    if (jornadasMetric.availability === 'error') {
      return {
        company,
        activeProducts,
        workers,
        staff,
        jornadas: jornadasMetric,
        scope: requested,
        selectedJornada: null,
        emptyCta: false,
        mode: 'empty',
        jornadaKpis: null,
        periodKpis: null,
        upcomingOpenings: {
          availability: 'error',
          value: null,
          detail: 'No se pudieron cargar las próximas aperturas.',
        },
        recentActivity: {
          availability: 'error',
          value: null,
          detail: 'No se pudo cargar la actividad reciente.',
        },
      };
    }

    const jornadas = jornadasMetric.value ?? [];
    const upcomingOpenings = this.buildUpcoming(jornadas);

    if (!jornadas.length) {
      return {
        company,
        activeProducts,
        workers,
        staff,
        jornadas: { availability: 'empty', value: [], detail: 'Aún no hay jornadas de apertura.' },
        scope: { kind: 'jornada', jornadaId: null },
        selectedJornada: null,
        emptyCta: true,
        mode: 'empty',
        jornadaKpis: null,
        periodKpis: null,
        upcomingOpenings,
        recentActivity: {
          availability: 'empty',
          value: [],
          detail: 'Sin actividad todavía.',
        },
      };
    }

    if (requested.kind === 'jornada') {
      const selected =
        (requested.jornadaId
          ? jornadas.find((j) => j.id === requested.jornadaId) ?? null
          : null) ?? this.autoSelectJornada(jornadas);

      if (!selected) {
        return {
          company,
          activeProducts,
          workers,
          staff,
          jornadas: jornadasMetric,
          scope: { kind: 'jornada', jornadaId: null },
          selectedJornada: null,
          emptyCta: true,
          mode: 'empty',
          jornadaKpis: null,
          periodKpis: null,
          upcomingOpenings,
          recentActivity: {
            availability: 'empty',
            value: [],
            detail: 'Sin actividad todavía.',
          },
        };
      }

      const [jornadaKpis, recentActivity] = await Promise.all([
        this.loadSingleJornadaKpis(companyId, selected.id),
        this.loadRecentActivity(companyId, [selected.id]),
      ]);

      return {
        company,
        activeProducts,
        workers,
        staff,
        jornadas: jornadasMetric,
        scope: { kind: 'jornada', jornadaId: selected.id },
        selectedJornada: selected,
        emptyCta: false,
        mode: 'jornada',
        jornadaKpis,
        periodKpis: null,
        upcomingOpenings,
        recentActivity,
      };
    }

    const range = this.resolvePeriodRange(requested);
    if (!range) {
      return {
        company,
        activeProducts,
        workers,
        staff,
        jornadas: jornadasMetric,
        scope: requested,
        selectedJornada: null,
        emptyCta: false,
        mode: 'period',
        jornadaKpis: null,
        periodKpis: {
          aperturas: {
            availability: 'unavailable',
            value: null,
            detail: 'Indica un rango de fechas válido.',
          },
          reservas: {
            availability: 'unavailable',
            value: null,
            detail: 'Indica un rango de fechas válido.',
          },
          pedidosRecibidos: {
            availability: 'unavailable',
            value: null,
            detail: 'Indica un rango de fechas válido.',
          },
          pedidosAtendidos: {
            availability: 'unavailable',
            value: null,
            detail: 'Indica un rango de fechas válido.',
          },
          facturacion: {
            availability: 'unavailable',
            value: null,
            detail: 'Indica un rango de fechas válido.',
          },
          facturacionSeries: {
            availability: 'unavailable',
            value: null,
            detail: 'Indica un rango de fechas válido.',
          },
        },
        upcomingOpenings,
        recentActivity: {
          availability: 'unavailable',
          value: null,
          detail: 'Indica un rango de fechas válido.',
        },
      };
    }

    const inRange = jornadas.filter(
      (j) => j.opening_date >= range.from && j.opening_date <= range.to,
    );
    const historical = inRange.filter((j) => j.status === 'open' || j.status === 'closed');
    const historicalIds = historical.map((j) => j.id);

    const [periodKpis, recentActivity] = await Promise.all([
      this.loadPeriodKpis(companyId, inRange, historicalIds, range),
      this.loadRecentActivity(companyId, historicalIds),
    ]);

    return {
      company,
      activeProducts,
      workers,
      staff,
      jornadas: jornadasMetric,
      scope: {
        kind: requested.kind,
        from: range.from,
        to: range.to,
        jornadaId: null,
      },
      selectedJornada: null,
      emptyCta: false,
      mode: 'period',
      jornadaKpis: null,
      periodKpis,
      upcomingOpenings,
      recentActivity,
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

  /** Auto-select: open → next scheduled → last closed → null. */
  autoSelectJornada(jornadas: JornadaSummary[], today = this.todayIso()): JornadaSummary | null {
    if (!jornadas.length) return null;

    const open = jornadas.find((j) => j.status === 'open');
    if (open) return open;

    const scheduled = jornadas
      .filter((j) => j.status === 'scheduled')
      .slice()
      .sort((a, b) => this.compareJornadaChronological(a, b));

    const upcoming = scheduled.find((j) => j.opening_date >= today);
    if (upcoming) return upcoming;
    if (scheduled.length) return scheduled[0];

    const closed = jornadas
      .filter((j) => j.status === 'closed')
      .slice()
      .sort((a, b) => this.compareJornadaChronological(b, a));
    return closed[0] ?? null;
  }

  private emptySnapshot(detail: string, scope: MetricsScope): AdminOverviewSnapshot {
    const missing: AdminMetric = { availability: 'unavailable', value: null, detail };
    return {
      company: { availability: 'unavailable', value: null, detail },
      activeProducts: missing,
      workers: missing,
      staff: { availability: 'unavailable', value: null, detail },
      jornadas: { availability: 'unavailable', value: null, detail },
      scope,
      selectedJornada: null,
      emptyCta: false,
      mode: 'empty',
      jornadaKpis: null,
      periodKpis: null,
      upcomingOpenings: { availability: 'unavailable', value: null, detail },
      recentActivity: { availability: 'unavailable', value: null, detail },
    };
  }

  private isMissingRpc(message: string, rpcName = 'update_own_company_name'): boolean {
    const t = message.toLowerCase();
    return t.includes('could not find the function') || t.includes(rpcName.toLowerCase());
  }

  private todayIso(d = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private addDaysIso(iso: string, delta: number): string {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + delta);
    return this.todayIso(dt);
  }

  private resolvePeriodRange(scope: MetricsScope): DateRange | null {
    const today = this.todayIso();
    if (scope.kind === 'last7') {
      return { from: this.addDaysIso(today, -6), to: today };
    }
    if (scope.kind === 'last30') {
      return { from: this.addDaysIso(today, -29), to: today };
    }
    if (scope.kind === 'custom') {
      const from = scope.from?.trim() || '';
      const to = scope.to?.trim() || '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
      if (from > to) return null;
      return { from, to };
    }
    return null;
  }

  private compareJornadaChronological(a: JornadaSummary, b: JornadaSummary): number {
    if (a.opening_date !== b.opening_date) return a.opening_date < b.opening_date ? -1 : 1;
    if (a.opens_at !== b.opens_at) return a.opens_at < b.opens_at ? -1 : 1;
    return a.name.localeCompare(b.name, 'es');
  }

  private buildUpcoming(jornadas: JornadaSummary[]): AdminMetric<JornadaSummary[]> {
    const today = this.todayIso();
    const upcoming = jornadas
      .filter((j) => j.status === 'scheduled' && j.opening_date >= today)
      .slice()
      .sort((a, b) => this.compareJornadaChronological(a, b))
      .slice(0, 8);
    return {
      availability: upcoming.length ? 'ready' : 'empty',
      value: upcoming,
      detail: upcoming.length ? undefined : 'No hay aperturas programadas próximas.',
    };
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

  private async loadJornadas(companyId: string): Promise<AdminMetric<JornadaSummary[]>> {
    const { data, error } = await this.db.client
      .from('floor_plans')
      .select('id, name, opening_date, opens_at, closes_at, closes_next_day, status')
      .eq('company_id', companyId)
      .order('opening_date', { ascending: false })
      .order('opens_at', { ascending: false });

    if (error) {
      return {
        availability: 'error',
        value: null,
        detail: 'No se pudieron cargar las jornadas.',
      };
    }

    const rows = (data ?? []) as JornadaSummary[];
    return {
      availability: rows.length ? 'ready' : 'empty',
      value: rows,
      detail: rows.length ? undefined : 'Aún no hay jornadas de apertura.',
    };
  }

  private async loadSingleJornadaKpis(
    companyId: string,
    jornadaId: string,
  ): Promise<SingleJornadaKpis> {
    const [tables, sales] = await Promise.all([
      this.loadTableFlags(companyId, [jornadaId]),
      this.loadSalesLines(companyId, [jornadaId]),
    ]);

    const balance = this.balanceFromSales(sales);

    return {
      reservas: this.ratioFromTables(tables, 'reserved', 'No se pudieron cargar las reservas.'),
      atendidas: this.ratioFromTables(tables, 'attended', 'No se pudo cargar las mesas atendidas.'),
      pedidosPendientes: this.pendingBottleMetric(tables),
      libres: this.freeTablesMetric(tables),
      facturacion: balance.total,
      balanceRows: balance.rows,
    };
  }

  private async loadPeriodKpis(
    companyId: string,
    inRange: JornadaSummary[],
    historicalIds: string[],
    range: DateRange,
  ): Promise<PeriodKpis> {
    const aperturas: AperturasBreakdown = {
      scheduled: inRange.filter((j) => j.status === 'scheduled').length,
      open: inRange.filter((j) => j.status === 'open').length,
      closed: inRange.filter((j) => j.status === 'closed').length,
      total: inRange.length,
    };

    const emptyOrders: AdminMetric = {
      availability: 'ready',
      value: 0,
      detail: 'Sin jornadas abiertas o cerradas en el periodo.',
    };

    const [tables, recibidos, atendidos, sales] = await Promise.all([
      historicalIds.length
        ? this.loadTableFlags(companyId, historicalIds)
        : Promise.resolve({
            availability: 'ready' as const,
            rows: [] as TableFlagRow[],
          }),
      historicalIds.length
        ? this.countOrders(companyId, historicalIds, ['OPEN', 'CLOSED'])
        : Promise.resolve(emptyOrders),
      historicalIds.length
        ? this.countOrders(companyId, historicalIds, ['CLOSED'])
        : Promise.resolve(emptyOrders),
      historicalIds.length
        ? this.loadSalesLines(companyId, historicalIds)
        : Promise.resolve({ availability: 'ready' as const, lines: [] as SalesLine[] }),
    ]);

    const series = this.facturacionSeriesFromSales(sales, range);

    return {
      aperturas: {
        availability: 'ready',
        value: aperturas,
        detail: aperturas.total === 0 ? 'No hay aperturas en el periodo seleccionado.' : undefined,
      },
      reservas: this.ratioFromTables(
        tables,
        'reserved',
        'No se pudieron cargar las reservas del periodo.',
        historicalIds.length === 0
          ? 'Sin jornadas abiertas o cerradas en el periodo.'
          : undefined,
      ),
      pedidosRecibidos: recibidos,
      pedidosAtendidos: atendidos,
      facturacion: series.total,
      facturacionSeries: series.points,
    };
  }

  private ratioFromTables(
    tables:
      | { availability: 'error'; detail: string }
      | { availability: 'ready'; rows: TableFlagRow[] },
    flag: 'reserved' | 'attended',
    errorDetail: string,
    emptyDetail?: string,
  ): AdminMetric<RatioMetric> {
    if (tables.availability === 'error') {
      return { availability: 'error', value: null, detail: errorDetail };
    }
    const denominator = tables.rows.length;
    const numerator = tables.rows.filter((r) => r[flag]).length;
    return {
      availability: 'ready',
      value: { numerator, denominator },
      detail:
        denominator === 0
          ? emptyDetail ?? 'No hay mesas en el alcance seleccionado.'
          : undefined,
    };
  }

  private pendingBottleMetric(
    tables:
      | { availability: 'error'; detail: string }
      | { availability: 'ready'; rows: TableFlagRow[] },
  ): AdminMetric {
    if (tables.availability === 'error') {
      return {
        availability: 'error',
        value: null,
        detail: 'No se pudieron cargar los pedidos pendientes.',
      };
    }
    return {
      availability: 'ready',
      value: tables.rows.filter((r) => r.hasPendingBottle).length,
      detail:
        tables.rows.length === 0 ? 'No hay mesas en el alcance seleccionado.' : undefined,
    };
  }

  private freeTablesMetric(
    tables:
      | { availability: 'error'; detail: string }
      | { availability: 'ready'; rows: TableFlagRow[] },
  ): AdminMetric<RatioMetric> {
    if (tables.availability === 'error') {
      return {
        availability: 'error',
        value: null,
        detail: 'No se pudieron cargar las mesas libres.',
      };
    }
    const denominator = tables.rows.length;
    const numerator = tables.rows.filter((r) => !r.reserved && !r.attended).length;
    return {
      availability: 'ready',
      value: { numerator, denominator },
      detail:
        denominator === 0 ? 'No hay mesas en el alcance seleccionado.' : undefined,
    };
  }

  private async loadSalesLines(
    companyId: string,
    floorPlanIds: string[],
  ): Promise<{ availability: 'error'; detail: string } | { availability: 'ready'; lines: SalesLine[] }> {
    if (!floorPlanIds.length) {
      return { availability: 'ready', lines: [] };
    }

    const { data, error } = await this.db.client
      .from('orders')
      .select(
        'id, status, tables!inner(floor_plan_id, floor_plans!inner(id, opening_date, company_id)), order_items(quantity, status, products(id, name, price))',
      )
      .eq('tables.floor_plans.company_id', companyId)
      .in('tables.floor_plan_id', floorPlanIds)
      .in('status', ['OPEN', 'CLOSED']);

    if (error) {
      return { availability: 'error', detail: 'orders' };
    }

    type OrderSalesRow = {
      tables:
        | {
            floor_plan_id: string;
            floor_plans: { id: string; opening_date: string; company_id: string } | null;
          }
        | {
            floor_plan_id: string;
            floor_plans: { id: string; opening_date: string; company_id: string } | null;
          }[]
        | null;
      order_items:
        | Array<{
            quantity: number | null;
            status: string | null;
            products: { id: string; name: string; price: number | null } | { id: string; name: string; price: number | null }[] | null;
          }>
        | null;
    };

    const lines: SalesLine[] = [];
    for (const row of (data ?? []) as unknown as OrderSalesRow[]) {
      const table = Array.isArray(row.tables) ? row.tables[0] : row.tables;
      const plan = table?.floor_plans ?? null;
      const openingDate = plan?.opening_date ?? null;
      if (!openingDate) continue;

      for (const item of row.order_items ?? []) {
        if ((item.status || '').toUpperCase() === 'CANCELLED') continue;
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        if (!product?.id) continue;
        const qty = Number(item.quantity) || 0;
        const price = Number(product.price) || 0;
        if (qty <= 0) continue;
        lines.push({
          openingDate,
          productId: product.id,
          productName: product.name || 'Producto',
          quantity: qty,
          amount: qty * price,
        });
      }
    }

    return { availability: 'ready', lines };
  }

  private balanceFromSales(
    sales: { availability: 'error'; detail: string } | { availability: 'ready'; lines: SalesLine[] },
  ): { total: AdminMetric; rows: AdminMetric<JornadaBalanceRow[]> } {
    if (sales.availability === 'error') {
      const err: AdminMetric = {
        availability: 'error',
        value: null,
        detail: 'No se pudo cargar la facturación de la jornada.',
      };
      return {
        total: err,
        rows: { availability: 'error', value: null, detail: err.detail },
      };
    }

    const byProduct = new Map<string, JornadaBalanceRow>();
    let total = 0;
    for (const line of sales.lines) {
      total += line.amount;
      const prev = byProduct.get(line.productId);
      if (prev) {
        prev.quantity += line.quantity;
        prev.amount += line.amount;
      } else {
        byProduct.set(line.productId, {
          productId: line.productId,
          productName: line.productName,
          quantity: line.quantity,
          amount: line.amount,
        });
      }
    }

    const rows = [...byProduct.values()].sort(
      (a, b) => b.amount - a.amount || a.productName.localeCompare(b.productName, 'es'),
    );

    return {
      total: {
        availability: 'ready',
        value: Math.round(total * 100) / 100,
        detail: rows.length ? undefined : 'Todavía no hay ventas en esta jornada.',
      },
      rows: {
        availability: rows.length ? 'ready' : 'empty',
        value: rows,
        detail: rows.length ? undefined : 'Todavía no hay ventas en esta jornada.',
      },
    };
  }

  private facturacionSeriesFromSales(
    sales: { availability: 'error'; detail: string } | { availability: 'ready'; lines: SalesLine[] },
    range: DateRange,
  ): { total: AdminMetric; points: AdminMetric<FacturacionPoint[]> } {
    if (sales.availability === 'error') {
      const err: AdminMetric = {
        availability: 'error',
        value: null,
        detail: 'No se pudo cargar la facturación del periodo.',
      };
      return {
        total: err,
        points: { availability: 'error', value: null, detail: err.detail },
      };
    }

    const byDate = new Map<string, number>();
    for (const line of sales.lines) {
      byDate.set(line.openingDate, (byDate.get(line.openingDate) ?? 0) + line.amount);
    }

    const points: FacturacionPoint[] = [];
    let cursor = range.from;
    let total = 0;
    while (cursor <= range.to) {
      const amount = Math.round((byDate.get(cursor) ?? 0) * 100) / 100;
      total += amount;
      points.push({ date: cursor, amount });
      cursor = this.addDaysIso(cursor, 1);
    }

    return {
      total: {
        availability: 'ready',
        value: Math.round(total * 100) / 100,
        detail: total > 0 ? undefined : 'Sin facturación en el periodo seleccionado.',
      },
      points: {
        availability: 'ready',
        value: points,
        detail: total > 0 ? undefined : 'Sin facturación en el periodo seleccionado.',
      },
    };
  }

  private async loadTableFlags(
    companyId: string,
    floorPlanIds: string[],
  ): Promise<
    | { availability: 'error'; detail: string }
    | { availability: 'ready'; rows: TableFlagRow[] }
  > {
    if (!floorPlanIds.length) {
      return { availability: 'ready', rows: [] };
    }

    const { data, error } = await this.db.client
      .from('tables')
      .select(
        'id, reserved, attended, floor_plans!inner(company_id), orders(status, order_items(status))',
      )
      .eq('floor_plans.company_id', companyId)
      .in('floor_plan_id', floorPlanIds);

    if (error) {
      return { availability: 'error', detail: 'tables' };
    }

    type OrderEmbed = {
      status?: string | null;
      order_items?: Array<{ status?: string | null }> | null;
    };

    return {
      availability: 'ready',
      rows: ((data ?? []) as unknown as Array<{
        reserved?: boolean;
        attended?: boolean;
        orders?: OrderEmbed[] | null;
      }>).map((row) => {
        const reserved = Boolean(row.reserved);
        const attended = Boolean(row.attended);
        const orders = row.orders ?? [];
        const hasPendingBottle =
          !attended &&
          orders.some(
            (order) =>
              order.status === 'OPEN' &&
              (order.order_items ?? []).some((item) => item.status === 'PENDING'),
          );
        return { reserved, attended, hasPendingBottle };
      }),
    };
  }

  private async countOrders(
    companyId: string,
    floorPlanIds: string[],
    statuses: OrderStatus[],
  ): Promise<AdminMetric> {
    if (!floorPlanIds.length) {
      return { availability: 'ready', value: 0 };
    }

    let query = this.db.client
      .from('orders')
      .select('id, tables!inner(floor_plan_id, floor_plans!inner(company_id))', {
        count: 'exact',
        head: true,
      })
      .eq('tables.floor_plans.company_id', companyId)
      .in('tables.floor_plan_id', floorPlanIds);

    if (statuses.length === 1) {
      query = query.eq('status', statuses[0]);
    } else {
      query = query.in('status', statuses);
    }

    const { count, error } = await query;

    if (error) {
      return {
        availability: 'error',
        value: null,
        detail: 'No se pudieron cargar los pedidos.',
      };
    }

    return {
      availability: 'ready',
      value: count ?? 0,
    };
  }

  private async loadRecentActivity(
    companyId: string,
    floorPlanIds: string[],
  ): Promise<AdminMetric<ActivityItem[]>> {
    if (!floorPlanIds.length) {
      return {
        availability: 'empty',
        value: [],
        detail: 'Sin actividad en el alcance seleccionado.',
      };
    }

    const { data, error } = await this.db.client
      .from('orders')
      .select(
        'id, status, created_at, tables!inner(number, type, reserved, attended, floor_plan_id, floor_plans!inner(id, name, company_id))',
      )
      .eq('tables.floor_plans.company_id', companyId)
      .in('tables.floor_plan_id', floorPlanIds)
      .in('status', ['OPEN', 'CLOSED'])
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) {
      return {
        availability: 'error',
        value: null,
        detail: 'No se pudo cargar la actividad reciente.',
      };
    }

    type PlanEmbed = { id: string; name: string; company_id: string } | null;
    type TableEmbed = {
      number: number | null;
      type?: string | null;
      reserved?: boolean | null;
      attended?: boolean | null;
      floor_plan_id: string;
      floor_plans: PlanEmbed | PlanEmbed[];
    };
    type OrderRow = {
      id: string;
      status: OrderStatus;
      created_at: string;
      tables: TableEmbed | TableEmbed[] | null;
    };

    const items: ActivityItem[] = ((data ?? []) as unknown as OrderRow[]).map((row) => {
      const table = Array.isArray(row.tables) ? row.tables[0] : row.tables;
      const planRaw = table?.floor_plans ?? null;
      const plan = Array.isArray(planRaw) ? planRaw[0] : planRaw;
      const attended = Boolean(table?.attended);
      const reserved = Boolean(table?.reserved);
      return {
        id: row.id,
        status: row.status,
        displayStatus: this.activityDisplayStatus(row.status, attended, reserved),
        created_at: row.created_at,
        table_number: table?.number ?? null,
        table_type: table?.type === 'RESERVED' ? 'RESERVED' : 'TABLE',
        table_reserved: reserved,
        table_attended: attended,
        floor_plan_id: table?.floor_plan_id ?? plan?.id ?? '',
        floor_plan_name: plan?.name?.trim() || null,
      };
    });

    return {
      availability: items.length ? 'ready' : 'empty',
      value: items,
      detail: items.length ? undefined : 'Sin actividad reciente.',
    };
  }

  /**
   * Align activity badges with the floor map:
   * attended/CLOSED → ATENDIDO; OPEN without attend → PENDIENTE; else reserved → RESERVADA.
   */
  private activityDisplayStatus(
    orderStatus: OrderStatus,
    attended: boolean,
    reserved: boolean,
  ): ActivityDisplayStatus {
    if (attended || orderStatus === 'CLOSED') {
      return 'ATENDIDO';
    }
    if (orderStatus === 'OPEN') {
      return 'PENDIENTE';
    }
    if (reserved) {
      return 'RESERVADA';
    }
    return 'PENDIENTE';
  }
}
