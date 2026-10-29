import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { ErrorMessageService, SupabaseService } from '../../core/infrastructure';
import { ProductService } from '../products';
import { UserAdminService } from '../users';
import { AdminCompanyContextService } from './admin-company-context.service';
import { AdminMetricsService, type JornadaSummary } from './admin-metrics.service';

describe('AdminMetricsService', () => {
  const auth: {
    whenReady: ReturnType<typeof vi.fn>;
    profile: ReturnType<typeof vi.fn>;
    hasRole: ReturnType<typeof vi.fn>;
    session: ReturnType<typeof vi.fn>;
    refreshProfile: ReturnType<typeof vi.fn>;
  } = {
    whenReady: vi.fn().mockResolvedValue(undefined),
    profile: vi.fn(),
    hasRole: vi.fn().mockReturnValue(true),
    session: vi.fn().mockReturnValue({ user: { id: 'admin-1' } }),
    refreshProfile: vi.fn().mockResolvedValue(undefined),
  };
  const products = { products: vi.fn() };
  const users = { countAdditionalCompanyUsers: vi.fn() };
  const maybeSingle = vi.fn();
  const orderProfiles = vi.fn();
  const eqCompanyProfiles = vi.fn();
  const selectProfiles = vi.fn();
  const fromMock = vi.fn();
  const rpcMock = vi.fn();

  const jornadasFixture: JornadaSummary[] = [
    {
      id: 'fp-open',
      name: 'Viernes VIP',
      opening_date: '2026-10-24',
      opens_at: '22:00:00',
      closes_at: '06:00:00',
      closes_next_day: true,
      status: 'open',
    },
    {
      id: 'fp-sched',
      name: 'Sábado',
      opening_date: '2026-10-31',
      opens_at: '22:00:00',
      closes_at: '06:00:00',
      closes_next_day: true,
      status: 'scheduled',
    },
    {
      id: 'fp-closed',
      name: 'Jueves',
      opening_date: '2026-10-23',
      opens_at: '22:00:00',
      closes_at: '06:00:00',
      closes_next_day: true,
      status: 'closed',
    },
  ];

  let floorPlansResult: { data: JornadaSummary[] | null; error: { message: string } | null };
  let tablesResult: {
    data: Array<{
      id: string;
      reserved: boolean;
      attended: boolean;
      orders?: Array<{ status: string; order_items?: Array<{ status: string }> }>;
    }> | null;
    error: { message: string } | null;
  };
  let ordersCountResult: { count: number | null; error: { message: string } | null };
  let ordersActivityResult: {
    data: Array<{
      id: string;
      status: string;
      created_at: string;
      tables: {
        number: number;
        type?: string;
        reserved?: boolean;
        attended?: boolean;
        floor_plan_id: string;
        floor_plans: { id: string; name: string; company_id: string };
      };
    }> | null;
    error: { message: string } | null;
  };
  let ordersSalesResult: {
    data: Array<{
      id: string;
      status: string;
      tables: {
        floor_plan_id: string;
        floor_plans: { id: string; opening_date: string; company_id: string };
      };
      order_items: Array<{
        quantity: number;
        status: string;
        products: { id: string; name: string; price: number };
      }>;
    }> | null;
    error: { message: string } | null;
  };

  function thenable<T>(result: T) {
    return {
      then: (onFulfilled?: (v: T) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve(result).then(onFulfilled, onRejected),
    };
  }

  function chainable(finalResult: unknown, extras: Record<string, unknown> = {}) {
    const builder: Record<string, unknown> = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      maybeSingle: maybeSingle,
      single: vi.fn(),
      update: vi.fn(),
      ...extras,
      then: thenable(finalResult).then,
    };
    for (const key of ['select', 'eq', 'in', 'order', 'limit', 'update']) {
      (builder[key] as ReturnType<typeof vi.fn>).mockReturnValue(builder);
    }
    return builder;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    auth.whenReady.mockResolvedValue(undefined);
    auth.profile.mockReturnValue({ id: 'admin-1', company_id: 'co-1' });
    auth.hasRole.mockReturnValue(true);
    auth.session.mockReturnValue({ user: { id: 'admin-1' } });
    auth.refreshProfile.mockResolvedValue(undefined);
    products.products.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    users.countAdditionalCompanyUsers.mockResolvedValue(3);
    maybeSingle.mockResolvedValue({ data: { id: 'co-1', name: 'Local VIP' }, error: null });
    orderProfiles.mockResolvedValue({
      data: [{ id: 'u1', full_name: 'Ana', username: 'ana', role: 'RECEPTOR', phone: null }],
      error: null,
    });
    eqCompanyProfiles.mockReturnValue({ order: orderProfiles });
    selectProfiles.mockReturnValue({ eq: eqCompanyProfiles });

    floorPlansResult = { data: [...jornadasFixture], error: null };
    tablesResult = {
      data: [
        {
          id: 't1',
          reserved: true,
          attended: false,
          orders: [{ status: 'OPEN', order_items: [{ status: 'PENDING' }] }],
        },
        {
          id: 't2',
          reserved: true,
          attended: true,
          orders: [{ status: 'CLOSED', order_items: [{ status: 'PLACED' }] }],
        },
        {
          id: 't3',
          reserved: false,
          attended: false,
          orders: [],
        },
      ],
      error: null,
    };
    ordersCountResult = { count: 5, error: null };
    ordersActivityResult = {
      data: [
        {
          id: 'o1',
          status: 'OPEN',
          created_at: '2026-10-24T23:00:00Z',
          tables: {
            number: 12,
            type: 'TABLE',
            reserved: false,
            attended: false,
            floor_plan_id: 'fp-open',
            floor_plans: { id: 'fp-open', name: 'Viernes VIP', company_id: 'co-1' },
          },
        },
        {
          id: 'o-attended-open',
          status: 'OPEN',
          created_at: '2026-10-24T22:50:00Z',
          tables: {
            number: 101,
            type: 'RESERVED',
            reserved: true,
            attended: true,
            floor_plan_id: 'fp-open',
            floor_plans: { id: 'fp-open', name: 'Viernes VIP', company_id: 'co-1' },
          },
        },
      ],
      error: null,
    };
    ordersSalesResult = {
      data: [
        {
          id: 'o-sales',
          status: 'OPEN',
          tables: {
            floor_plan_id: 'fp-open',
            floor_plans: { id: 'fp-open', opening_date: '2026-10-24', company_id: 'co-1' },
          },
          order_items: [
            {
              quantity: 2,
              status: 'PLACED',
              products: { id: 'prod-1', name: 'Gin tonic', price: 12 },
            },
            {
              quantity: 1,
              status: 'PENDING',
              products: { id: 'prod-2', name: 'Botella premium', price: 110 },
            },
          ],
        },
      ],
      error: null,
    };

    fromMock.mockImplementation((table: string) => {
      if (table === 'companies') {
        return chainable(null, {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle }),
          }),
        });
      }
      if (table === 'profiles') {
        return { select: selectProfiles };
      }
      if (table === 'floor_plans') {
        return chainable(floorPlansResult);
      }
      if (table === 'tables') {
        return chainable(tablesResult);
      }
      if (table === 'orders') {
        // Distinguish sales / count / activity by select payload and limit usage.
        const root: Record<string, unknown> = {};
        const select = vi.fn().mockImplementation((cols: unknown) => {
          const colText = String(cols ?? '');
          if (colText.includes('order_items')) {
            return chainable(ordersSalesResult);
          }
          const builder = chainable(ordersCountResult);
          const limit = vi.fn().mockImplementation(() => {
            Object.assign(builder, thenable(ordersActivityResult));
            return builder;
          });
          builder['limit'] = limit;
          return builder;
        });
        root['select'] = select;
        return root;
      }
      return { select: selectProfiles };
    });
    rpcMock.mockResolvedValue({ data: null, error: { message: 'Could not find the function' } });

    TestBed.configureTestingModule({
      providers: [
        AdminMetricsService,
        AdminCompanyContextService,
        { provide: AuthService, useValue: auth },
        { provide: SupabaseService, useValue: { client: { from: fromMock, rpc: rpcMock } } },
        { provide: ProductService, useValue: products },
        { provide: UserAdminService, useValue: users },
        { provide: ErrorMessageService, useValue: { humanize: (_e: unknown, f: string) => f } },
      ],
    });
  });

  it('auto-selects open jornada and loads single-jornada KPIs', async () => {
    const service = TestBed.inject(AdminMetricsService);
    const ctx = TestBed.inject(AdminCompanyContextService);
    const snap = await service.loadOverview({ kind: 'jornada' });

    expect(snap.company).toEqual({
      availability: 'ready',
      value: { id: 'co-1', name: 'Local VIP' },
    });
    expect(ctx.companyName()).toBe('Local VIP');
    expect(snap.mode).toBe('jornada');
    expect(snap.selectedJornada?.id).toBe('fp-open');
    expect(snap.emptyCta).toBe(false);
    expect(snap.jornadaKpis?.reservas.value).toEqual({ numerator: 2, denominator: 3 });
    expect(snap.jornadaKpis?.atendidas.value).toEqual({ numerator: 1, denominator: 3 });
    expect(snap.jornadaKpis?.pedidosPendientes.value).toBe(1);
    expect(snap.jornadaKpis?.libres.value).toEqual({ numerator: 1, denominator: 3 });
    expect(snap.jornadaKpis?.facturacion.value).toBe(134);
    expect(snap.jornadaKpis?.balanceRows.value).toEqual([
      { productId: 'prod-2', productName: 'Botella premium', quantity: 1, amount: 110 },
      { productId: 'prod-1', productName: 'Gin tonic', quantity: 2, amount: 24 },
    ]);
    expect(snap.upcomingOpenings.value?.map((j) => j.id)).toContain('fp-sched');
    expect(snap.recentActivity.availability).toBe('ready');
    expect(snap.recentActivity.value?.[0]?.table_number).toBe(12);
    expect(snap.recentActivity.value?.[0]?.displayStatus).toBe('PENDIENTE');
    expect(snap.recentActivity.value?.[0]?.floor_plan_name).toBe('Viernes VIP');
    expect(snap.recentActivity.value?.[1]?.table_number).toBe(101);
    expect(snap.recentActivity.value?.[1]?.displayStatus).toBe('ATENDIDO');
    expect(snap.staff.availability).toBe('ready');
  });

  it('autoSelectJornada prefers open → next scheduled → last closed', () => {
    const service = TestBed.inject(AdminMetricsService);
    expect(service.autoSelectJornada(jornadasFixture, '2026-10-28')?.id).toBe('fp-open');

    const withoutOpen = jornadasFixture.filter((j) => j.status !== 'open');
    expect(service.autoSelectJornada(withoutOpen, '2026-10-28')?.id).toBe('fp-sched');

    const onlyClosed = jornadasFixture.filter((j) => j.status === 'closed');
    expect(service.autoSelectJornada(onlyClosed, '2026-10-28')?.id).toBe('fp-closed');

    expect(service.autoSelectJornada([], '2026-10-28')).toBeNull();
  });

  it('returns empty CTA when there are no jornadas', async () => {
    floorPlansResult = { data: [], error: null };
    const service = TestBed.inject(AdminMetricsService);
    const snap = await service.loadOverview();
    expect(snap.emptyCta).toBe(true);
    expect(snap.mode).toBe('empty');
    expect(snap.jornadaKpis).toBeNull();
    expect(snap.jornadas.availability).toBe('empty');
  });

  it('returns unavailable when profile has no company_id', async () => {
    auth.profile.mockReturnValue({ id: 'admin-1', company_id: null });
    const service = TestBed.inject(AdminMetricsService);
    const snap = await service.loadOverview();
    expect(snap.company.availability).toBe('unavailable');
    expect(snap.jornadas.availability).toBe('unavailable');
    expect(products.products).not.toHaveBeenCalled();
  });

  it('marks KPIs as error when tables query fails (no fake zeros)', async () => {
    tablesResult = { data: null, error: { message: 'boom' } };
    const service = TestBed.inject(AdminMetricsService);
    const snap = await service.loadOverview({ kind: 'jornada', jornadaId: 'fp-open' });
    expect(snap.jornadaKpis?.reservas.availability).toBe('error');
    expect(snap.jornadaKpis?.reservas.value).toBeNull();
    expect(snap.jornadaKpis?.atendidas.availability).toBe('error');
    expect(snap.jornadaKpis?.atendidas.value).toBeNull();
  });

  it('loads period KPIs for last 7 days using only open/closed for reservas', async () => {
    // Freeze relative dates by using fixture dates around "today" — service uses real Date.
    // Include open + closed + scheduled; reservas query receives only historical ids.
    const service = TestBed.inject(AdminMetricsService);
    const snap = await service.loadOverview({ kind: 'last7' });

    expect(snap.mode).toBe('period');
    expect(snap.periodKpis).toBeTruthy();
    expect(snap.periodKpis?.aperturas.availability).toBe('ready');
    expect(snap.periodKpis?.reservas.availability).toBe('ready');
    expect(snap.periodKpis?.pedidosRecibidos.availability).toBe('ready');
    expect(snap.periodKpis?.pedidosAtendidos.availability).toBe('ready');
    expect(snap.periodKpis?.facturacion.availability).toBe('ready');
    expect(snap.periodKpis?.facturacionSeries.availability).toBe('ready');
    expect(snap.periodKpis?.facturacionSeries.value?.length).toBe(7);
    // Scope resolved to a concrete range
    expect(snap.scope.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(snap.scope.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('marks jornadas error without inventing empty data', async () => {
    floorPlansResult = { data: null, error: { message: 'fail' } };
    const service = TestBed.inject(AdminMetricsService);
    const snap = await service.loadOverview();
    expect(snap.jornadas.availability).toBe('error');
    expect(snap.jornadas.value).toBeNull();
    expect(snap.upcomingOpenings.availability).toBe('error');
    expect(snap.recentActivity.availability).toBe('error');
  });

  it('updateCompanyName uses RPC when available', async () => {
    rpcMock.mockResolvedValue({ data: 'Nuevo Local', error: null });
    const service = TestBed.inject(AdminMetricsService);
    const ctx = TestBed.inject(AdminCompanyContextService);
    await expect(service.updateCompanyName('Nuevo Local')).resolves.toBe('Nuevo Local');
    expect(ctx.companyName()).toBe('Nuevo Local');
  });

  it('updateOwnAdminProfile uses RPC when available and refreshes profile', async () => {
    rpcMock.mockResolvedValue({
      data: { full_name: 'Ana Boss', phone: '+34 600 111 222' },
      error: null,
    });
    const service = TestBed.inject(AdminMetricsService);
    await expect(
      service.updateOwnAdminProfile({ fullName: 'Ana Boss', phone: '+34 600 111 222' }),
    ).resolves.toEqual({ fullName: 'Ana Boss', phone: '+34 600 111 222' });
    expect(auth.refreshProfile).toHaveBeenCalled();
  });
});
