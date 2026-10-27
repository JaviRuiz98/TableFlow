import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SupabaseService } from '../../core/infrastructure';
import { TableDeletionService } from './table-deletion.service';

describe('TableDeletionService (mocked RPC)', () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        TableDeletionService,
        {
          provide: SupabaseService,
          useValue: { client: { rpc } },
        },
      ],
    });
  });

  it('maps DELETED result and passes force=false by default', async () => {
    rpc.mockResolvedValue({ data: { ok: true, reason: 'DELETED' }, error: null });
    const service = TestBed.inject(TableDeletionService);
    await expect(service.delete('t1', 'secret')).resolves.toEqual({ ok: true, reason: 'DELETED' });
    expect(rpc).toHaveBeenCalledWith('delete_table_with_orders', {
      p_table_id: 't1',
      p_secret: 'secret',
      p_force: false,
    });
  });

  it('preserves BAD_PASSWORD and SERVED_PRODUCTS reasons', async () => {
    const service = TestBed.inject(TableDeletionService);
    rpc.mockResolvedValue({ data: { ok: false, reason: 'BAD_PASSWORD' }, error: null });
    await expect(service.delete('t1', 'bad')).resolves.toEqual({ ok: false, reason: 'BAD_PASSWORD' });

    rpc.mockResolvedValue({ data: { ok: false, reason: 'SERVED_PRODUCTS' }, error: null });
    await expect(service.delete('t1', 'ok', true)).resolves.toEqual({
      ok: false,
      reason: 'SERVED_PRODUCTS',
    });
    expect(rpc).toHaveBeenLastCalledWith('delete_table_with_orders', {
      p_table_id: 't1',
      p_secret: 'ok',
      p_force: true,
    });
  });

  it('returns NOT_PERSISTED when RPC says so', async () => {
    rpc.mockResolvedValue({ data: { ok: true, reason: 'NOT_PERSISTED' }, error: null });
    const service = TestBed.inject(TableDeletionService);
    await expect(service.delete('missing', 'x')).resolves.toEqual({
      ok: true,
      reason: 'NOT_PERSISTED',
    });
  });

  it('throws when Supabase returns an error', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('network') });
    const service = TestBed.inject(TableDeletionService);
    await expect(service.delete('t1', 'x')).rejects.toThrow('network');
  });
});
