import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SupabaseService } from '../../core/infrastructure';
import { FloorPlanService } from './floor-plan.service';

type QueryResult = { data: unknown; error: unknown };

function createQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder['select'] = vi.fn(self);
  builder['insert'] = vi.fn(self);
  builder['update'] = vi.fn(self);
  builder['delete'] = vi.fn(self);
  builder['eq'] = vi.fn(self);
  builder['order'] = vi.fn(self);
  builder['limit'] = vi.fn(self);
  builder['single'] = vi.fn(() => Promise.resolve(result));
  builder['then'] = (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

describe('FloorPlanService', () => {
  let service: FloorPlanService;
  let fromMock: ReturnType<typeof vi.fn>;
  let rpcMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fromMock = vi.fn();
    rpcMock = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        FloorPlanService,
        {
          provide: SupabaseService,
          useValue: { client: { from: fromMock, rpc: rpcMock } },
        },
      ],
    });
    service = TestBed.inject(FloorPlanService);
  });

  it('lists floor plans ordered by name', async () => {
    const rows = [{ id: 'p1', name: 'Sala' }];
    fromMock.mockReturnValue(createQueryBuilder({ data: rows, error: null }));
    await expect(service.list()).resolves.toEqual(rows);
    expect(fromMock).toHaveBeenCalledWith('floor_plans');
  });

  it('creates a plan with defaults width/height', async () => {
    const created = { id: 'p2', name: 'Nueva', width: 2000, height: 1200 };
    const builder = createQueryBuilder({ data: created, error: null });
    fromMock.mockReturnValue(builder);
    await expect(service.create('Nueva', 2000, 1200, 'user-1')).resolves.toEqual(created);
    expect(builder['insert']).toHaveBeenCalledWith({
      name: 'Nueva',
      width: 2000,
      height: 1200,
      created_by: 'user-1',
    });
  });

  it('setLocked updates is_locked', async () => {
    const builder = createQueryBuilder({ data: null, error: null });
    fromMock.mockReturnValue(builder);
    await service.setLocked('p1', true);
    expect(builder['update']).toHaveBeenCalledWith({ is_locked: true });
  });

  it('saveSnapshot calls replace_floor_plan_snapshot with table ids', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    await service.saveSnapshot('plan-1', {
      elements: [],
      tables: [
        {
          id: 't1',
          floor_plan_id: 'plan-1',
          type: 'TABLE',
          number: 1,
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          shape: 'circle',
          attended: false,
          observation: null,
          created_at: '',
          updated_at: '',
        },
      ],
      reserved: [],
    });
    expect(rpcMock).toHaveBeenCalledWith(
      'replace_floor_plan_snapshot',
      expect.objectContaining({
        p_floor_plan_id: 'plan-1',
        p_tables: [expect.objectContaining({ id: 't1' })],
      }),
    );
  });

  it('propagates Supabase errors from remove', async () => {
    fromMock.mockReturnValue(createQueryBuilder({ data: null, error: new Error('denied') }));
    await expect(service.remove('p1')).rejects.toThrow('denied');
  });
});
