import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SupabaseService } from '../../../core/infrastructure';
import { ProductService } from './product.service';

type QueryResult = { data: unknown; error: unknown };

function createQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder['select'] = vi.fn(self);
  builder['insert'] = vi.fn(self);
  builder['update'] = vi.fn(self);
  builder['eq'] = vi.fn(self);
  builder['order'] = vi.fn(self);
  builder['single'] = vi.fn(() => Promise.resolve(result));
  builder['then'] = (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

describe('ProductService', () => {
  let service: ProductService;
  let fromMock: ReturnType<typeof vi.fn>;
  let rpcMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fromMock = vi.fn();
    rpcMock = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        ProductService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: fromMock,
              rpc: rpcMock,
            },
          },
        },
      ],
    });

    service = TestBed.inject(ProductService);
  });

  it('lists only active products via products table', async () => {
    const products = [{ id: 'p1', active: true, name: 'Gin' }];
    fromMock.mockReturnValue(createQueryBuilder({ data: products, error: null }));

    await expect(service.products()).resolves.toEqual(products);
    expect(fromMock).toHaveBeenCalledWith('products');
  });

  it('creates a product with null price', async () => {
    const created = { id: 'p2', category_id: 'c1', name: 'Ron', price: null, active: true };
    const builder = createQueryBuilder({ data: created, error: null });
    fromMock.mockReturnValue(builder);

    await expect(service.createProduct('c1', 'Ron')).resolves.toEqual(created);
    expect(fromMock).toHaveBeenCalledWith('products');
    expect(builder['insert']).toHaveBeenCalledWith({ category_id: 'c1', name: 'Ron', price: null });
  });

  it('returns true from deleteProductSafe only when RPC returns true', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    await expect(service.deleteProductSafe('p1')).resolves.toBe(true);

    rpcMock.mockResolvedValue({ data: false, error: null });
    await expect(service.deleteProductSafe('p1')).resolves.toBe(false);

    expect(rpcMock).toHaveBeenCalledWith('delete_product_safe', { p_product_id: 'p1' });
  });

  it('maps productHasOrderHistory RPC boolean strictly', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    await expect(service.productHasOrderHistory('p1')).resolves.toBe(true);

    rpcMock.mockResolvedValue({ data: false, error: null });
    await expect(service.productHasOrderHistory('p1')).resolves.toBe(false);
  });

  it('propagates RPC errors from categoryHasOrderHistory', async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error('blocked') });
    await expect(service.categoryHasOrderHistory('c1')).rejects.toThrow('blocked');
  });
});
