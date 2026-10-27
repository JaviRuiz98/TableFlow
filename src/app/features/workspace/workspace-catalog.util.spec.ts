import { applyCatalogDelete, catalogDeleteBlockedMessage } from './workspace-catalog.util';
import type { Product, ProductCategory } from '../../core/models/models';

const category: ProductCategory = {
  id: 'c1',
  name: 'Bebidas',
  sort_order: 0,
  created_at: '',
  updated_at: '',
};

const product: Product = {
  id: 'p1',
  category_id: 'c1',
  name: 'Agua',
  price: null,
  active: true,
  created_at: '',
  updated_at: '',
};

describe('workspace-catalog.util', () => {
  it('blocked messages match previous confirmCatalogDelete copy', () => {
    expect(catalogDeleteBlockedMessage({ kind: 'product', product })).toContain('producto');
    expect(catalogDeleteBlockedMessage({ kind: 'category', category })).toContain('categoría');
  });

  it('applyCatalogDelete removes product only', () => {
    const next = applyCatalogDelete(
      { kind: 'product', product },
      [category],
      [product],
      { c1: 'draft' },
    );
    expect(next.products).toEqual([]);
    expect(next.categories).toEqual([category]);
    expect(next.newProductName).toEqual({ c1: 'draft' });
    expect(next.toast).toBe('Producto eliminado');
  });

  it('applyCatalogDelete removes category, its products and draft name', () => {
    const next = applyCatalogDelete(
      { kind: 'category', category },
      [category],
      [product],
      { c1: 'draft' },
    );
    expect(next.categories).toEqual([]);
    expect(next.products).toEqual([]);
    expect(next.newProductName).toEqual({});
    expect(next.toast).toBe('Categoría eliminada');
  });
});
