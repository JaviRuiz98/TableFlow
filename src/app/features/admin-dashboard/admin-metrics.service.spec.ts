import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { ErrorMessageService, SupabaseService } from '../../core/infrastructure';
import { ProductService } from '../products';
import { UserAdminService } from '../users';
import { AdminCompanyContextService } from './admin-company-context.service';
import { AdminMetricsService } from './admin-metrics.service';

describe('AdminMetricsService', () => {
  const auth = {
    whenReady: vi.fn().mockResolvedValue(undefined),
    profile: vi.fn(),
    hasRole: vi.fn().mockReturnValue(true),
  };
  const products = { products: vi.fn() };
  const users = { countAdditionalCompanyUsers: vi.fn() };
  const maybeSingle = vi.fn();
  const order = vi.fn();
  const eqCompany = vi.fn();
  const selectProfiles = vi.fn();
  const fromMock = vi.fn();
  const rpcMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    auth.whenReady.mockResolvedValue(undefined);
    auth.profile.mockReturnValue({ id: 'admin-1', company_id: 'co-1' });
    auth.hasRole.mockReturnValue(true);
    products.products.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    users.countAdditionalCompanyUsers.mockResolvedValue(3);
    maybeSingle.mockResolvedValue({ data: { id: 'co-1', name: 'Local VIP' }, error: null });
    order.mockResolvedValue({
      data: [{ id: 'u1', full_name: 'Ana', username: 'ana', role: 'RECEPTOR', phone: null }],
      error: null,
    });
    eqCompany.mockReturnValue({ order });
    selectProfiles.mockReturnValue({ eq: eqCompany });
    fromMock.mockImplementation((table: string) => {
      if (table === 'companies') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }) };
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
        { provide: ErrorMessageService, useValue: { humanize: (e: unknown, f: string) => f } },
      ],
    });
  });

  it('loads tenant-scoped metrics and keeps activity unavailable', async () => {
    const service = TestBed.inject(AdminMetricsService);
    const ctx = TestBed.inject(AdminCompanyContextService);
    const snap = await service.loadOverview();

    expect(snap.company).toEqual({
      availability: 'ready',
      value: { id: 'co-1', name: 'Local VIP' },
    });
    expect(ctx.companyName()).toBe('Local VIP');
    expect(snap.activeProducts.availability).toBe('ready');
    expect(snap.activeProducts.value).toBe(2);
    expect(snap.workers.value).toBe(4);
    expect(snap.tablesConfigured.value).toBe(0);
    expect(snap.pendingOrders.value).toBe(0);
    expect(snap.activityAvailable).toBe(false);
    expect(snap.staff.availability).toBe('ready');
  });

  it('returns unavailable when profile has no company_id', async () => {
    auth.profile.mockReturnValue({ id: 'admin-1', company_id: null });
    const service = TestBed.inject(AdminMetricsService);
    const snap = await service.loadOverview();
    expect(snap.company.availability).toBe('unavailable');
    expect(snap.activeProducts.availability).toBe('unavailable');
    expect(products.products).not.toHaveBeenCalled();
  });

  it('updateCompanyName uses RPC when available', async () => {
    rpcMock.mockResolvedValue({ data: 'Nuevo Local', error: null });
    const service = TestBed.inject(AdminMetricsService);
    const ctx = TestBed.inject(AdminCompanyContextService);
    await expect(service.updateCompanyName('Nuevo Local')).resolves.toBe('Nuevo Local');
    expect(ctx.companyName()).toBe('Nuevo Local');
  });

  it('updateOwnAdminProfile uses RPC when available and refreshes profile', async () => {
    auth.session = vi.fn().mockReturnValue({ user: { id: 'admin-1' } });
    auth.refreshProfile = vi.fn().mockResolvedValue(undefined);
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
