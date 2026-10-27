import type { Product, ProductCategory } from '../../../core/models/models';

export type CatalogDeleteTarget =
  | { kind: 'product'; product: Product }
  | { kind: 'category'; category: ProductCategory };

export function catalogDeleteBlockedMessage(target: CatalogDeleteTarget): string {
  if (target.kind === 'category') {
    return 'Algún producto de esta categoría acaba de ser utilizado en un pedido y la categoría ya no puede eliminarse.';
  }
  return 'Este producto acaba de ser utilizado en un pedido y ya no puede eliminarse.';
}

/** Apply a successful safe-delete to local catalog lists (immutable). */
export function applyCatalogDelete(
  target: CatalogDeleteTarget,
  categories: ProductCategory[],
  products: Product[],
  newProductName: Record<string, string>,
): {
  categories: ProductCategory[];
  products: Product[];
  newProductName: Record<string, string>;
  toast: string;
} {
  if (target.kind === 'product') {
    return {
      categories,
      products: products.filter((item) => item.id !== target.product.id),
      newProductName,
      toast: 'Producto eliminado',
    };
  }

  const nextNames = { ...newProductName };
  delete nextNames[target.category.id];
  return {
    categories: categories.filter((item) => item.id !== target.category.id),
    products: products.filter((item) => item.category_id !== target.category.id),
    newProductName: nextNames,
    toast: 'Categoría eliminada',
  };
}
