import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SupabaseService } from '../../../core/infrastructure';
import { FloorPlanService } from './floor-plan.service';
import { fixturePlan, fixtureTable, fixtureWall } from '../../../../testing/fixtures';
import { createQueryBuilder } from '../../../../testing/supabase-query-mock';

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
    await expect(service.create('Nueva', 2000, 1200, 'company-1')).resolves.toEqual(created);
    expect(builder['insert']).toHaveBeenCalledWith({
      name: 'Nueva',
      width: 2000,
      height: 1200,
      company_id: 'company-1',
      opening_date: expect.any(String),
      opens_at: '22:00:00',
      closes_at: '06:00:00',
      closes_next_day: true,
      status: 'scheduled',
      is_active: false,
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
          reserved: false,
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

  it('load maps elements/tables and splits RESERVED', async () => {
    const reserved = { ...fixtureTable, id: 'r1', type: 'RESERVED' as const, number: 9 };
    fromMock
      .mockReturnValueOnce(createQueryBuilder({ data: [fixtureWall], error: null }))
      .mockReturnValueOnce(createQueryBuilder({ data: [fixtureTable, reserved], error: null }));

    const snap = await service.load(fixturePlan.id);
    expect(snap.elements[0]?.id).toBe(fixtureWall.id);
    expect(snap.tables.map((t) => t.id)).toEqual([fixtureTable.id]);
    expect(snap.reserved?.map((t) => t.id)).toEqual(['r1']);
  });

  it('setTableAttended and setTableObservation call RPCs without remote writes in test', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    await service.setTableAttended('t1', false);
    await service.setTableObservation('t1', 'VIP');
    expect(rpcMock).toHaveBeenCalledWith('set_table_attended', {
      p_table_id: 't1',
      p_attended: false,
    });
    expect(rpcMock).toHaveBeenCalledWith('set_table_observation', {
      p_table_id: 't1',
      p_observation: 'VIP',
    });
  });

  it('createOperationalTarget inserts next number within the same type', async () => {
    fromMock
      .mockReturnValueOnce(createQueryBuilder({ data: [{ number: 3 }], error: null }))
      .mockReturnValueOnce(
        createQueryBuilder({
          data: { ...fixtureTable, number: 4, attended: false },
          error: null,
        }),
      );
    const created = await service.createOperationalTarget(fixturePlan.id, 'TABLE');
    expect(created.number).toBe(4);
    expect(created.attended).toBe(false);
    const selectBuilder = fromMock.mock.results[0]?.value;
    expect(selectBuilder.eq).toHaveBeenCalledWith('type', 'TABLE');
  });
});
