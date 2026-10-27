import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonModal } from '@ionic/angular/standalone';
import { AuthService } from '../../../../core/auth/auth.service';
import type {
  ClubTable,
  OrderItemCategoryGroup,
  OrderItemWithProduct,
  Product,
} from '../../../../core/models/models';
import { FloorPlanService } from '../../../floor-plans';
import { OrderService } from '../../../orders';
import { ProductService } from '../../../products';

type ProductOrderGroup = { id: string; name: string; products: Product[] };

/**
 * Operativo order / observation / attendance modal.
 * Parent owns Stage + pendingMap; this component owns order UI state.
 */
@Component({
  selector: 'app-order-attention-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonModal],
  templateUrl: './order-attention-dialog.component.html',
  styleUrl: './order-attention-dialog.component.scss',
})
export class OrderAttentionDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() target: ClubTable | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() pendingChanged = new EventEmitter<number>();
  @Output() canvasRefresh = new EventEmitter<void>();
  @Output() targetPatched = new EventEmitter<ClubTable>();

  selectedOrderTarget: ClubTable | null = null;
  observationDraft = '';
  observationSaving = false;
  observationMessage = '';
  attendanceSaving = false;
  attendanceError = '';
  selectedProductId = '';
  quantity = 1;
  categoryProductSelection: Record<string, string> = {};
  categoryProductSearch: Record<string, string> = {};
  categoryProductQuantity: Record<string, number> = {};
  products: Product[] = [];
  productCategories: Array<{ id: string; name: string }> = [];
  orderItems: WritableSignal<OrderItemWithProduct[]> = signal([]);
  selectedPending = 0;
  private ordersLoadRequestId = 0;
  private catalogLoaded = false;
  private dismissEmitted = false;

  constructor(
    private readonly floors: FloorPlanService,
    private readonly orders: OrderService,
    private readonly productService: ProductService,
    private readonly auth: AuthService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  get isAdmin(): boolean {
    return this.auth.hasRole('ADMIN');
  }

  get canManageOrders(): boolean {
    return this.isAdmin;
  }

  get currentOrderItems(): OrderItemWithProduct[] {
    return this.orderItems().filter((item) => item.status === 'PENDING' && item.attended !== true);
  }

  get attendedOrderItems(): OrderItemWithProduct[] {
    return this.orderItems().filter((item) => item.status === 'PLACED' || item.attended === true);
  }

  get currentOrderGroups(): OrderItemCategoryGroup[] {
    return this.groupOrderItemsByCategory(this.currentOrderItems);
  }

  get attendedOrderGroups(): OrderItemCategoryGroup[] {
    return this.groupOrderItemsByCategory(this.attendedOrderItems);
  }

  get canSetAttendedStatus(): boolean {
    if (this.currentOrderItems.length > 0) return true;
    return Boolean((this.selectedOrderTarget?.observation ?? '').trim());
  }

  get activeProducts(): Product[] {
    return this.products.filter((product) => product.active !== false);
  }

  get productGroupsForOrdering(): ProductOrderGroup[] {
    const active = this.activeProducts;
    const groups = this.productCategories
      .map((category) => ({
        id: category.id,
        name: category.name,
        products: active.filter((product) => product.category_id === category.id),
      }))
      .filter((group) => group.products.length > 0);

    const knownIds = new Set(this.productCategories.map((category) => category.id));
    const uncategorized = active.filter((product) => !knownIds.has(product.category_id));
    if (uncategorized.length) groups.push({ id: 'uncategorized', name: 'Otros', products: uncategorized });
    return groups;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] && !changes['target']) return;
    if (this.open && this.target) {
      void this.prepareAndLoad(this.target);
    } else if (!this.open) {
      this.resetLocalState();
    }
  }

  /** Parent realtime hook — reload orders/observation if modal is open. */
  async reloadIfOpen(): Promise<void> {
    if (!this.open || !this.selectedOrderTarget) return;
    if (!this.observationSaving) {
      this.observationDraft = this.selectedOrderTarget.observation ?? '';
    }
    await this.loadOrdersForTarget(this.selectedOrderTarget);
  }

  closeOrderDialog(): void {
    if (this.dismissEmitted) return;
    if (!this.open && !this.selectedOrderTarget) return;
    this.dismissEmitted = true;
    this.resetLocalState();
    this.closed.emit();
  }

  async saveObservation(): Promise<void> {
    const target = this.selectedOrderTarget;
    if (!target || !this.isAdmin || this.observationSaving) return;

    const normalized = this.observationDraft.trim();
    this.observationSaving = true;
    this.observationMessage = '';
    try {
      await this.floors.setTableObservation(target.id, normalized || null);
      target.observation = normalized || null;
      target.attended = false;
      target.updated_at = new Date().toISOString();
      this.observationDraft = target.observation ?? '';
      this.observationMessage = 'Observación guardada · mesa pendiente';
      this.targetPatched.emit(target);
      this.canvasRefresh.emit();
    } catch (error) {
      console.error('Error guardando observación:', error);
      this.observationMessage = 'No se pudo guardar la observación';
    } finally {
      this.observationSaving = false;
      this.cdr.detectChanges();
    }
  }

  async markAttended(attended: boolean): Promise<void> {
    const target = this.selectedOrderTarget;
    if (!target || this.attendanceSaving) return;
    if (attended && !this.canSetAttendedStatus) return;

    const previous = target.attended;
    const startedAt = Date.now();
    this.attendanceSaving = true;
    this.attendanceError = '';
    this.cdr.detectChanges();

    target.attended = attended;
    target.updated_at = new Date().toISOString();
    this.targetPatched.emit(target);
    this.canvasRefresh.emit();

    try {
      await this.floors.setTableAttended(target.id, attended);
      await this.loadOrdersForTarget(target);
      this.pendingChanged.emit(this.selectedPending);

      const elapsed = Date.now() - startedAt;
      if (elapsed < 300) {
        await new Promise((resolve) => setTimeout(resolve, 300 - elapsed));
      }

      if (attended) {
        this.observationMessage = '';
        this.attendanceSaving = false;
        this.cdr.detectChanges();
        this.closeOrderDialog();
        return;
      }
    } catch (error) {
      target.attended = previous;
      this.targetPatched.emit(target);
      this.canvasRefresh.emit();
      this.attendanceError = 'No se pudo actualizar. Inténtalo de nuevo.';
      console.error('Error actualizando el estado de atención:', error);
    } finally {
      this.attendanceSaving = false;
      this.cdr.detectChanges();
    }
  }

  filteredProductsForCategory(group: { id: string; products: Product[] }): Product[] {
    const term = (this.categoryProductSearch[group.id] ?? '').trim().toLocaleLowerCase('es');
    if (!term) return group.products;
    return group.products.filter((product) => product.name.toLocaleLowerCase('es').includes(term));
  }

  async addProductFromCategory(categoryId: string): Promise<void> {
    if (!this.canManageOrders) return;
    const productId = this.categoryProductSelection[categoryId] ?? '';
    const quantity = Math.max(1, Math.floor(Number(this.categoryProductQuantity[categoryId] ?? 1)));
    const added = await this.addProductToOrder(productId, quantity);
    if (added) {
      this.categoryProductSelection[categoryId] = '';
      this.categoryProductQuantity[categoryId] = 1;
      this.categoryProductSearch[categoryId] = '';
    }
  }

  async addOrderItem(): Promise<void> {
    if (!this.canManageOrders) return;
    const added = await this.addProductToOrder(this.selectedProductId, this.quantity);
    if (added) {
      this.quantity = 1;
      this.selectedProductId = '';
    }
  }

  async changeItemQuantity(item: OrderItemWithProduct, delta: number): Promise<void> {
    if (!this.canManageOrders) return;
    const nextQuantity = Number(item.quantity) + delta;
    if (nextQuantity <= 0) {
      await this.removeOrderItem(item);
      return;
    }
    const session = this.auth.session();
    if (!session) return;
    try {
      if (item.attended === true || item.status !== 'PENDING') return;
      await this.orders.updatePendingItemQuantity(item.id, nextQuantity);
      await this.loadOrdersForTarget();
      this.pendingChanged.emit(this.selectedPending);
      this.canvasRefresh.emit();
    } catch (error) {
      console.error('Error modificando producto:', error);
    }
  }

  async removeOrderItem(item: OrderItemWithProduct): Promise<void> {
    if (!this.canManageOrders || item.attended === true || item.status !== 'PENDING') return;
    const session = this.auth.session();
    if (!session) return;
    try {
      await this.orders.cancelPendingItem(item.id);
      await this.loadOrdersForTarget();
      this.pendingChanged.emit(this.selectedPending);
      this.canvasRefresh.emit();
    } catch (error) {
      console.error('Error eliminando producto:', error);
    }
  }

  async markPlaced(id: string): Promise<void> {
    if (!this.canManageOrders) return;
    const session = this.auth.session();
    if (!session) {
      console.error('No hay una sesión activa.');
      return;
    }
    try {
      await this.orders.markPlaced(id, session.user.id);
      if (this.selectedOrderTarget) {
        await this.loadOrdersForTarget(this.selectedOrderTarget);
      }
      this.pendingChanged.emit(this.selectedPending);
    } catch (error) {
      console.error('Error marcando producto como puesto:', error);
    }
  }

  private async prepareAndLoad(target: ClubTable): Promise<void> {
    this.dismissEmitted = false;
    this.selectedOrderTarget = target;
    this.selectedProductId = '';
    this.quantity = 1;
    this.categoryProductSelection = {};
    this.categoryProductSearch = {};
    this.categoryProductQuantity = {};
    this.observationDraft = target.observation ?? '';
    this.observationMessage = '';
    this.attendanceSaving = false;
    this.attendanceError = '';
    await this.ensureCatalog();
    await this.loadOrdersForTarget(target);
  }

  private async ensureCatalog(): Promise<void> {
    if (this.catalogLoaded) return;
    this.products = await this.productService.products();
    try {
      this.productCategories = await this.productService.categories();
    } catch {
      this.productCategories = [];
    }
    this.catalogLoaded = true;
  }

  private async loadOrdersForTarget(target?: ClubTable): Promise<void> {
    const requestId = ++this.ordersLoadRequestId;
    const orderTarget = target ?? this.selectedOrderTarget;

    if (!orderTarget) {
      if (requestId !== this.ordersLoadRequestId) return;
      this.orderItems.set([]);
      this.selectedPending = 0;
      this.cdr.detectChanges();
      return;
    }

    try {
      const result = await this.orders.forTable(orderTarget.id);
      if (requestId !== this.ordersLoadRequestId) return;

      this.orderItems.set([...result.items]);
      this.selectedPending = this.currentOrderItems.reduce((total, item) => total + item.quantity, 0);
      this.pendingChanged.emit(this.selectedPending);
      this.cdr.detectChanges();
    } catch (error) {
      if (requestId !== this.ordersLoadRequestId) return;
      console.error('Error cargando pedido:', error);
      this.orderItems.set([]);
      this.selectedPending = 0;
      this.cdr.detectChanges();
    }
  }

  private async addProductToOrder(productId: string, quantity: number): Promise<boolean> {
    const target = this.selectedOrderTarget;
    if (!target || !productId || quantity < 1) return false;

    const session = this.auth.session();
    if (!session) return false;

    try {
      await this.orders.addItem(target.id, productId, Math.floor(quantity), session.user.id);
      await this.floors.setTableAttended(target.id, false);
      target.attended = false;
      target.updated_at = new Date().toISOString();
      await this.loadOrdersForTarget(target);
      this.pendingChanged.emit(this.selectedPending);
      this.targetPatched.emit(target);
      this.canvasRefresh.emit();
      return true;
    } catch (error) {
      console.error('Error añadiendo producto:', error);
      return false;
    }
  }

  private groupOrderItemsByCategory(items: OrderItemWithProduct[]): OrderItemCategoryGroup[] {
    const known = this.productCategories
      .map((category) => ({
        id: category.id,
        name: category.name,
        items: items.filter((item) => item.product?.category_id === category.id),
      }))
      .filter((group) => group.items.length > 0);
    const knownIds = new Set(this.productCategories.map((category) => category.id));
    const uncategorized = items.filter((item) => !knownIds.has(item.product?.category_id));
    if (uncategorized.length) known.push({ id: 'uncategorized', name: 'Otros', items: uncategorized });
    return known;
  }

  private resetLocalState(): void {
    this.attendanceSaving = false;
    this.attendanceError = '';
    this.selectedOrderTarget = null;
    this.selectedProductId = '';
    this.quantity = 1;
    this.categoryProductSelection = {};
    this.categoryProductSearch = {};
    this.categoryProductQuantity = {};
    this.observationDraft = '';
    this.observationMessage = '';
    this.orderItems.set([]);
    this.selectedPending = 0;
  }
}
