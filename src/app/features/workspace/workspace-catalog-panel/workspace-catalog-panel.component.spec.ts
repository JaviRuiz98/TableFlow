import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../../../../core/auth/auth.service';
import type { Product, ProductCategory } from '../../../../core/models/models';
import { ProductService } from '../../../products';
import { WorkspaceCatalogPanelComponent } from './workspace-catalog-panel.component';

const sampleCategory: ProductCategory = {
  id: 'c1',
  name: 'Bebidas',
  sort_order: 0,
  created_at: '',
  updated_at: '',
};

const sampleProduct: Product = {
  id: 'pr1',
  category_id: 'c1',
  name: 'Agua',
  price: null,
  active: true,
  created_at: '',
  updated_at: '',
};

describe('WorkspaceCatalogPanelComponent', () => {
  const product = {
    categories: vi.fn().mockResolvedValue([sampleCategory]),
    products: vi.fn().mockResolvedValue([sampleProduct]),
    createCategory: vi.fn(),
    createProduct: vi.fn(),
    updateCategory: vi.fn(),
    updateProduct: vi.fn(),
    productHasOrderHistory: vi.fn(),
    categoryHasOrderHistory: vi.fn(),
    deleteProductSafe: vi.fn(),
    deleteCategorySafe: vi.fn(),
  };
  const auth = {
    hasRole: vi.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.hasRole.mockReturnValue(true);
    product.categories.mockResolvedValue([sampleCategory]);
    product.products.mockResolvedValue([sampleProduct]);
    TestBed.configureTestingModule({
      imports: [WorkspaceCatalogPanelComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: ProductService, useValue: product },
      ],
    });
  });

  async function create(): Promise<WorkspaceCatalogPanelComponent> {
    const fixture = TestBed.createComponent(WorkspaceCatalogPanelComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.componentInstance;
  }

  it('loads categories and products on init', async () => {
    const cmp = await create();
    expect(cmp.categories()).toEqual([sampleCategory]);
    expect(cmp.products()).toEqual([sampleProduct]);
  });

  it('catalog delete product blocked path', async () => {
    product.productHasOrderHistory.mockResolvedValue(true);
    const cmp = await create();
    await cmp.askDeleteProduct(sampleProduct);
    expect(cmp.catalogDeleteDialog()).toBe(true);
    expect(cmp.catalogDeleteBlocked()).toBe(true);
    expect(cmp.productToDelete()?.id).toBe('pr1');
  });

  it('confirmCatalogDelete applies product removal and emits toast', async () => {
    product.deleteProductSafe.mockResolvedValue(true);
    const cmp = await create();
    const toast = vi.fn();
    cmp.toastMessage.subscribe(toast);
    cmp.productToDelete.set(sampleProduct);
    cmp.catalogDeleteDialog.set(true);
    await cmp.confirmCatalogDelete();
    expect(cmp.products()).toEqual([]);
    expect(cmp.catalogDeleteDialog()).toBe(false);
    expect(toast).toHaveBeenCalledWith('Producto eliminado');
  });

  it('createCategory emits toast on success', async () => {
    product.createCategory.mockResolvedValue({ ...sampleCategory, id: 'c2', name: 'Snacks' });
    const cmp = await create();
    const toast = vi.fn();
    cmp.toastMessage.subscribe(toast);
    cmp.newCategory = 'Snacks';
    await cmp.createCategory();
    expect(product.createCategory).toHaveBeenCalledWith('Snacks');
    expect(toast).toHaveBeenCalledWith('Categoría creada');
  });

  it('reset closes dialogs and clears forms', async () => {
    const cmp = await create();
    cmp.editCategoryDialog.set(true);
    cmp.catalogDeleteDialog.set(true);
    cmp.newCategory = 'x';
    cmp.reset();
    expect(cmp.editCategoryDialog()).toBe(false);
    expect(cmp.catalogDeleteDialog()).toBe(false);
    expect(cmp.newCategory).toBe('');
  });
});
