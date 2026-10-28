import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonInput, IonModal } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/auth/auth.service';
import type { Product, ProductCategory } from '../../../core/models/models';
import { ProductService } from '../../products';
import { applyCatalogDelete, catalogDeleteBlockedMessage } from './workspace-catalog.util';

/**
 * ADMIN productos tab: category/product list + edit/delete dialogs.
 * Owns catalog data via ProductService; parent receives toastMessage and calls reset().
 */
@Component({
  selector: 'app-workspace-catalog-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, IonInput, IonModal],
  templateUrl: './workspace-catalog-panel.component.html',
  styleUrl: './workspace-catalog-panel.component.scss',
})
export class WorkspaceCatalogPanelComponent implements OnInit {
  /** When true, copy explains the guided setup finish CTA in the parent topbar. */
  @Input() guidedSetup = false;
  @Output() toastMessage = new EventEmitter<string>();
  /** Emitted after a product row is persisted (parent may validate company_id). */
  @Output() productCreated = new EventEmitter<Product>();

  categories = signal<ProductCategory[]>([]);

  products = signal<Product[]>([]);
  newCategory = '';
  newProductName: Record<string, string> = {};

  editCategoryDialog = signal(false);
  categoryToEdit = signal<ProductCategory | null>(null);
  editCategoryName = '';
  editProductDialog = signal(false);
  productToEdit = signal<Product | null>(null);
  editProductName = '';
  catalogDeleteDialog = signal(false);
  catalogDeleteBlocked = signal(false);
  catalogDeleteChecking = signal(false);
  catalogDeleteError = signal('');
  categoryToDelete = signal<ProductCategory | null>(null);
  productToDelete = signal<Product | null>(null);

  constructor(
    private readonly auth: AuthService,
    private readonly product: ProductService,
  ) {}

  private get isAdmin(): boolean {
    return this.auth.hasRole('ADMIN');
  }

  async ngOnInit(): Promise<void> {
    try {
      this.categories.set(await this.product.categories());
      this.products.set(await this.product.products());
    } catch (error) {
      this.toastMessage.emit(error instanceof Error ? error.message : 'Error cargando catálogo');
    }
  }

  /** Clears overlays/forms — called from Workspace resetTransientUi / logout. */
  reset(): void {
    this.editCategoryDialog.set(false);
    this.editProductDialog.set(false);
    this.catalogDeleteDialog.set(false);
    this.catalogDeleteBlocked.set(false);
    this.catalogDeleteChecking.set(false);
    this.catalogDeleteError.set('');
    this.categoryToEdit.set(null);
    this.productToEdit.set(null);
    this.categoryToDelete.set(null);
    this.productToDelete.set(null);
    this.editCategoryName = '';
    this.editProductName = '';
    this.newCategory = '';
    this.newProductName = {};
  }

  productsFor(categoryId: string): Product[] {
    return this.products().filter((product) => product.category_id === categoryId);
  }

  async createCategory(): Promise<void> {
    if (!this.isAdmin) return;
    const name = this.newCategory.trim();
    if (!name) return;
    try {
      const category = await this.product.createCategory(name);
      this.categories.update((current) => [...current, category]);
      this.newCategory = '';
      this.toastMessage.emit('Categoría creada');
    } catch (error) {
      this.toastMessage.emit(error instanceof Error ? error.message : 'No se pudo crear la categoría');
    }
  }

  async createProduct(categoryId: string): Promise<void> {
    if (!this.isAdmin) return;
    const name = this.newProductName[categoryId]?.trim();
    if (!name) return;
    try {
      const product = await this.product.createProduct(categoryId, name);
      this.products.update((current) => [...current, product]);
      this.newProductName[categoryId] = '';
      this.toastMessage.emit('Producto añadido');
      this.productCreated.emit(product);
    } catch (error) {
      this.toastMessage.emit(error instanceof Error ? error.message : 'No se pudo crear el producto');
    }
  }

  openEditCategory(category: ProductCategory): void {
    if (!this.isAdmin) return;
    this.categoryToEdit.set(category);
    this.editCategoryName = category.name;
    this.editCategoryDialog.set(true);
  }

  closeEditCategory(): void {
    this.editCategoryDialog.set(false);
    this.categoryToEdit.set(null);
    this.editCategoryName = '';
  }

  async saveCategoryName(): Promise<void> {
    const category = this.categoryToEdit();
    const name = this.editCategoryName.trim();
    if (!this.isAdmin || !category || !name) return;
    try {
      await this.product.updateCategory(category.id, name);
      this.categories.update((items) => items.map((item) => (item.id === category.id ? { ...item, name } : item)));
      this.closeEditCategory();
      this.toastMessage.emit('Nombre de categoría actualizado');
    } catch (error) {
      this.toastMessage.emit(error instanceof Error ? error.message : 'No se pudo actualizar la categoría');
    }
  }

  openEditProduct(product: Product): void {
    if (!this.isAdmin) return;
    this.productToEdit.set(product);
    this.editProductName = product.name;
    this.editProductDialog.set(true);
  }

  closeEditProduct(): void {
    this.editProductDialog.set(false);
    this.productToEdit.set(null);
    this.editProductName = '';
  }

  async saveProductName(): Promise<void> {
    const product = this.productToEdit();
    const name = this.editProductName.trim();
    if (!this.isAdmin || !product || !name) return;
    try {
      await this.product.updateProduct(product.id, { name });
      this.products.update((items) => items.map((item) => (item.id === product.id ? { ...item, name } : item)));
      this.closeEditProduct();
      this.toastMessage.emit('Nombre de producto actualizado');
    } catch (error) {
      this.toastMessage.emit(error instanceof Error ? error.message : 'No se pudo actualizar el producto');
    }
  }

  async askDeleteProduct(product: Product): Promise<void> {
    if (!this.isAdmin || this.catalogDeleteChecking()) return;
    this.catalogDeleteChecking.set(true);
    this.catalogDeleteError.set('');
    this.productToDelete.set(product);
    this.categoryToDelete.set(null);
    try {
      const used = await this.product.productHasOrderHistory(product.id);
      this.catalogDeleteBlocked.set(used);
      this.catalogDeleteDialog.set(true);
    } catch (error) {
      this.productToDelete.set(null);
      this.toastMessage.emit(error instanceof Error ? error.message : 'No se pudo comprobar el producto');
    } finally {
      this.catalogDeleteChecking.set(false);
    }
  }

  async askDeleteCategory(category: ProductCategory): Promise<void> {
    if (!this.isAdmin || this.catalogDeleteChecking()) return;
    this.catalogDeleteChecking.set(true);
    this.catalogDeleteError.set('');
    this.categoryToDelete.set(category);
    this.productToDelete.set(null);
    try {
      const used = await this.product.categoryHasOrderHistory(category.id);
      this.catalogDeleteBlocked.set(used);
      this.catalogDeleteDialog.set(true);
    } catch (error) {
      this.categoryToDelete.set(null);
      this.toastMessage.emit(error instanceof Error ? error.message : 'No se pudo comprobar la categoría');
    } finally {
      this.catalogDeleteChecking.set(false);
    }
  }

  closeCatalogDeleteDialog(): void {
    this.catalogDeleteDialog.set(false);
    this.catalogDeleteBlocked.set(false);
    this.catalogDeleteError.set('');
    this.categoryToDelete.set(null);
    this.productToDelete.set(null);
  }

  async confirmCatalogDelete(): Promise<void> {
    if (!this.isAdmin || this.catalogDeleteBlocked() || this.catalogDeleteChecking()) return;
    const category = this.categoryToDelete();
    const product = this.productToDelete();
    if (!category && !product) return;
    this.catalogDeleteChecking.set(true);
    this.catalogDeleteError.set('');
    try {
      if (product) {
        const deleted = await this.product.deleteProductSafe(product.id);
        if (!deleted) {
          this.catalogDeleteBlocked.set(true);
          this.catalogDeleteError.set(catalogDeleteBlockedMessage({ kind: 'product', product }));
          return;
        }
        const next = applyCatalogDelete(
          { kind: 'product', product },
          this.categories(),
          this.products(),
          this.newProductName,
        );
        this.products.set(next.products);
        this.newProductName = next.newProductName;
        this.toastMessage.emit(next.toast);
      } else if (category) {
        const deleted = await this.product.deleteCategorySafe(category.id);
        if (!deleted) {
          this.catalogDeleteBlocked.set(true);
          this.catalogDeleteError.set(catalogDeleteBlockedMessage({ kind: 'category', category }));
          return;
        }
        const next = applyCatalogDelete(
          { kind: 'category', category },
          this.categories(),
          this.products(),
          this.newProductName,
        );
        this.categories.set(next.categories);
        this.products.set(next.products);
        this.newProductName = next.newProductName;
        this.toastMessage.emit(next.toast);
      }
      this.closeCatalogDeleteDialog();
    } catch (error) {
      this.catalogDeleteError.set(error instanceof Error ? error.message : 'No se pudo eliminar');
    } finally {
      this.catalogDeleteChecking.set(false);
    }
  }
}
