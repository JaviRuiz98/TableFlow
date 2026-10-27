import { Component, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButton,
  IonIcon,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonToast,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonModal,
  IonInputPasswordToggle,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  addOutline,
  trashOutline,
  copyOutline,
  settingsOutline,
  closeOutline,
  personAddOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  createOutline,
} from 'ionicons/icons';

import { AuthService } from '../../core/auth/auth.service';
import { normalizeUsername } from '../../core/auth/auth-identity';
import { ErrorMessageService, SupabaseService } from '../../core/infrastructure';
import { FloorPlanService, PlanDuplicationService } from '../floor-plans';
import { ProductService } from '../products';
import { OrderService } from '../orders';
import { UserAdminService } from '../users';
import { OrderNotificationService } from '../notifications';
import type { ClubTable, FloorPlan, Product, ProductCategory, Role } from '../../core/models/models';
import { PlanEditorComponent, TableProductPanelComponent } from '../floor-editor';
import { NEW_OBSERVATION_ALERT, NEW_ORDER_ALERT } from './workspace-alerts.util';
import { canSubmitNewUserForm, validateNewUserForm } from './workspace-user-form.util';
import { initialWorkspacePresentation } from './workspace-init.util';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButton,
    IonIcon,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonToast,
      IonInput,
    IonSelect,
    IonSelectOption,
    IonModal,
    IonInputPasswordToggle,
    PlanEditorComponent,
    TableProductPanelComponent,
  ],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
})
export class WorkspaceComponent implements OnInit, OnDestroy {
  @ViewChild(PlanEditorComponent) private planEditor?: PlanEditorComponent;
  activeTab = signal<'planos' | 'operativo' | 'productos'>('planos');
  editorMode = signal<'editor' | 'operativo'>('editor');
  showMap = signal(true);
  plans = signal<FloorPlan[]>([]);
  selectedPlan = signal<FloorPlan | null>(null);
  categories = signal<ProductCategory[]>([]);
  products = signal<Product[]>([]);
  pendingCount = signal(0);
  toast = signal('');
  configured = true;
  newCategory = '';
  newProductName: Record<string, string> = {};
  createPlanDialog = signal(false);
  newPlanName = '';

  userAccessDialog = signal(false);
  createUserDialog = signal(false);
  verifyingUserAccess = signal(false);
  creatingUser = signal(false);
  userAccessError = signal('');
  createUserError = signal('');
  adminAccessPassword = '';
  newUserFullName = '';
  newUserUsername = '';
  newUserPassword = '';
  newUserRole: Role = 'USER';
  copyPlanDialog = signal(false);
  planToCopy = signal<FloorPlan | null>(null);
  copyPlanName = '';
  renamePlanDialog = signal(false);
  planToRename = signal<FloorPlan | null>(null);
  renamePlanName = '';
  deletePlanDialog = signal(false);
  planToDelete = signal<FloorPlan | null>(null);
  newOrderAlert = signal(false);
  userAlertTitle = signal(NEW_ORDER_ALERT.title);
  userAlertEyebrow = signal(NEW_ORDER_ALERT.eyebrow);
  userAlertMessage = signal(NEW_ORDER_ALERT.message);

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
  private verifiedAdminPassword = '';
  private channel: any;
  private userOrderChannel: any;


  /**
   * Limpia cualquier estado visual transitorio para que una nueva sesión
   * nunca herede diálogos, formularios ni avisos de la sesión anterior.
   */
  private resetTransientUi(): void {
    this.createPlanDialog.set(false);
    this.userAccessDialog.set(false);
    this.createUserDialog.set(false);
    this.copyPlanDialog.set(false);
    this.renamePlanDialog.set(false);
    this.deletePlanDialog.set(false);
    this.newOrderAlert.set(false);
    this.userAlertTitle.set(NEW_ORDER_ALERT.title);
    this.userAlertEyebrow.set(NEW_ORDER_ALERT.eyebrow);
    this.userAlertMessage.set(NEW_ORDER_ALERT.message);
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
    this.toast.set('');

    this.newPlanName = '';
    this.adminAccessPassword = '';
    this.userAccessError.set('');
    this.createUserError.set('');
    this.verifiedAdminPassword = '';
    this.newUserFullName = '';
    this.newUserUsername = '';
    this.newUserPassword = '';
    this.newUserRole = 'USER';
    this.planToCopy.set(null);
    this.copyPlanName = '';
    this.planToRename.set(null);
    this.renamePlanName = '';
    this.planToDelete.set(null);
  }

  constructor(
    private auth: AuthService,
    private floors: FloorPlanService,
    private product: ProductService,
    private orders: OrderService,
    private userAdmin: UserAdminService,
    private duplication: PlanDuplicationService,
    private notifications: OrderNotificationService,
    private errors: ErrorMessageService,
    private supabase: SupabaseService,
    private router: Router,
  ) {
    addIcons({
      logOutOutline,
      addOutline,
      trashOutline,
      copyOutline,
      settingsOutline,
      closeOutline,
      personAddOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      createOutline,
    });
    this.configured = this.supabase.configured;
  }

  get activeLabel(): string {
    return this.activeTab() === 'planos' ? 'Planos' : this.activeTab() === 'operativo' ? 'Operativa' : 'Productos';
  }
  get isAdmin(): boolean {
    return this.auth.hasRole('ADMIN');
  }
  get canCreateUser(): boolean {
    return canSubmitNewUserForm(this.newUserFormState());
  }

  private newUserFormState() {
    return {
      fullName: this.newUserFullName,
      username: this.newUserUsername,
      password: this.newUserPassword,
      role: this.newUserRole,
      verifiedAdminPassword: this.verifiedAdminPassword,
    };
  }

  async ngOnInit(): Promise<void> {
    // Una sesión nueva siempre parte con todos los overlays cerrados.
    this.resetTransientUi();
    try {
      this.plans.set(await this.floors.list());
      this.categories.set(await this.product.categories());
      this.products.set(await this.product.products());
      const presentation = initialWorkspacePresentation(this.isAdmin, this.plans());
      this.activeTab.set(presentation.activeTab);
      this.editorMode.set(presentation.editorMode);
      this.showMap.set(presentation.showMap);
      this.selectedPlan.set(presentation.selectedPlan);
      if (presentation.subscribeUserOrderAlerts) {
        this.userOrderChannel = this.notifications.subscribeToNewOrderItems(
          () => this.showUserAlert(NEW_ORDER_ALERT),
          () => this.showUserAlert(NEW_OBSERVATION_ALERT),
        );
      }
      this.channel = this.orders.subscribe(() => this.refreshOperationalData(), 'workspace-orders');
    } catch (error) {
      this.toast.set(error instanceof Error ? error.message : 'Error cargando datos');
    }
  }

  ngOnDestroy(): void {
    this.channel?.unsubscribe?.();
    this.userOrderChannel?.unsubscribe?.();
  }

  private async refreshOperationalData(): Promise<void> {
    // Los cambios se sincronizan por Supabase Realtime.
    // El aviso visual de nuevos pedidos se gestiona exclusivamente
    // mediante OrderNotificationService cuando se inserta un order_item.
    return;
  }

  private showUserAlert(copy: typeof NEW_ORDER_ALERT): void {
    this.userAlertEyebrow.set(copy.eyebrow);
    this.userAlertTitle.set(copy.title);
    this.userAlertMessage.set(copy.message);
    this.newOrderAlert.set(true);
    void this.refreshOperationalData();
  }

  openOperationalTarget(target: ClubTable): void {
    void this.planEditor?.openOperationalTarget(target);
  }

  async toggleEditorMode(): Promise<void> {
    if (!this.isAdmin) return;

    if (this.editorMode() === 'editor') {
      // Al salir del editor persistimos el diseño antes de mostrar el plano operativo.
      const saved = await this.planEditor?.saveDesign(false);
      if (saved === false) {
        this.toast.set('No se pudo guardar el diseño. Continúas en modo edición.');
        return;
      }
      this.editorMode.set('operativo');
      this.showMap.set(true);
      return;
    }

    this.editorMode.set('editor');
    this.showMap.set(true);
  }

  toggleMapVisibility(): void {
    if (!this.isAdmin || this.editorMode() !== 'operativo') return;
    this.showMap.update((visible) => !visible);
  }

  openCreatePlanDialog(): void {
    this.newPlanName = '';
    this.createPlanDialog.set(true);
  }
  closeCreatePlanDialog(): void {
    this.createPlanDialog.set(false);
    this.newPlanName = '';
  }

  openUserAccessDialog(): void {
    if (!this.isAdmin) {
      this.toast.set('Solo los administradores pueden gestionar usuarios');
      return;
    }
    this.adminAccessPassword = '';
    this.userAccessError.set('');
    this.userAccessDialog.set(true);
  }

  closeUserAccessDialog(): void {
    this.userAccessDialog.set(false);
    this.adminAccessPassword = '';
    this.userAccessError.set('');
  }

  async verifyUserAccess(): Promise<void> {
    if (!this.isAdmin || !this.adminAccessPassword || this.verifyingUserAccess()) return;
    this.verifyingUserAccess.set(true);
    this.userAccessError.set('');
    try {
      const ok = await this.userAdmin.verifyAccess(this.adminAccessPassword);
      if (!ok) {
        this.userAccessError.set('Contraseña incorrecta');
        return;
      }
      this.verifiedAdminPassword = this.adminAccessPassword;
      this.userAccessDialog.set(false);
      this.adminAccessPassword = '';
      this.resetNewUserForm();
      this.createUserDialog.set(true);
    } catch (error) {
      this.userAccessError.set(error instanceof Error ? error.message : 'No se pudo verificar la contraseña');
    } finally {
      this.verifyingUserAccess.set(false);
    }
  }

  closeCreateUserDialog(): void {
    this.createUserDialog.set(false);
    this.verifiedAdminPassword = '';
    this.resetNewUserForm();
  }

  private resetNewUserForm(): void {
    this.newUserFullName = '';
    this.newUserUsername = '';
    this.newUserPassword = '';
    this.newUserRole = 'USER';
    this.createUserError.set('');
  }

  async createUser(): Promise<void> {
    if (!this.isAdmin || this.creatingUser()) return;

    const validationError = validateNewUserForm(this.newUserFormState());
    if (validationError) {
      this.createUserError.set(validationError);
      return;
    }

    this.creatingUser.set(true);
    this.createUserError.set('');
    try {
      await this.userAdmin.createUser({
        full_name: this.newUserFullName.trim(),
        username: normalizeUsername(this.newUserUsername),
        password: this.newUserPassword,
        role: this.newUserRole,
        admin_password: this.verifiedAdminPassword,
      });
      const username = normalizeUsername(this.newUserUsername);
      this.closeCreateUserDialog();
      this.toast.set(`Usuario ${username} creado correctamente`);
    } catch (error) {
      this.createUserError.set(this.errors.humanize(error, 'No se pudo crear el usuario'));
    } finally {
      this.creatingUser.set(false);
    }
  }

  async createPlan(): Promise<void> {
    if (!this.isAdmin) return;
    const name = this.newPlanName.trim();
    const session = this.auth.session();
    if (!name || !session) {
      this.toast.set('No hay una sesión activa');
      return;
    }
    try {
      const plan = await this.floors.create(name, 2000, 1200, session.user.id);
      this.plans.update((current) => [...current, plan]);
      this.selectedPlan.set(plan);
      this.editorMode.set('editor');
      this.showMap.set(true);
      this.activeTab.set('operativo');
      this.closeCreatePlanDialog();
      this.toast.set('Plano creado correctamente');
    } catch (error) {
      this.toast.set(error instanceof Error ? error.message : 'No se pudo crear el plano');
    }
  }

  openPlan(plan: FloorPlan): void {
    this.selectedPlan.set(plan);
    this.editorMode.set('operativo');
    this.showMap.set(this.isAdmin);
    this.activeTab.set('operativo');
  }
  openEditor(plan: FloorPlan): void {
    if (!this.isAdmin) return;
    this.selectedPlan.set(plan);
    this.editorMode.set('editor');
    this.showMap.set(true);
    this.activeTab.set('operativo');
  }
  openPlanById(id: string): void {
    const plan = this.plans().find((item) => item.id === id);
    if (plan) this.openPlan(plan);
  }

  askDuplicate(plan: FloorPlan): void {
    if (!this.isAdmin) return;
    this.planToCopy.set(plan);
    this.copyPlanName = `${plan.name} copia`;
    this.copyPlanDialog.set(true);
  }

  closeCopyDialog(): void {
    this.copyPlanDialog.set(false);
    this.planToCopy.set(null);
    this.copyPlanName = '';
  }

  async confirmDuplicate(): Promise<void> {
    const plan = this.planToCopy();
    const session = this.auth.session();
    const name = this.copyPlanName.trim();
    if (!this.isAdmin || !plan || !session || !name) return;
    try {
      const copy = await this.duplication.duplicate(plan, session.user.id, name);
      this.plans.update((current) => [...current, copy].sort((a, b) => a.name.localeCompare(b.name)));
      this.closeCopyDialog();
      this.toast.set('Plano copiado correctamente');
    } catch (error) {
      this.toast.set(error instanceof Error ? error.message : 'No se pudo copiar el plano');
    }
  }

  openRenamePlanDialog(plan: FloorPlan): void {
    if (!this.isAdmin) return;
    this.planToRename.set(plan);
    this.renamePlanName = plan.name;
    this.renamePlanDialog.set(true);
  }

  closeRenamePlanDialog(): void {
    this.renamePlanDialog.set(false);
    this.planToRename.set(null);
    this.renamePlanName = '';
  }

  async confirmRenamePlan(): Promise<void> {
    const plan = this.planToRename();
    const name = this.renamePlanName.trim();
    if (!this.isAdmin || !plan || !name) return;
    try {
      await this.floors.update(plan.id, { name });
      this.plans.update((current) => current.map((item) => item.id === plan.id ? { ...item, name } : item).sort((a, b) => a.name.localeCompare(b.name)));
      if (this.selectedPlan()?.id === plan.id) this.selectedPlan.set({ ...this.selectedPlan()!, name });
      this.closeRenamePlanDialog();
      this.toast.set('Nombre del plano actualizado');
    } catch (error) {
      this.toast.set(error instanceof Error ? error.message : 'No se pudo cambiar el nombre');
    }
  }

  acknowledgeNewOrder(): void {
    this.newOrderAlert.set(false);
    this.activeTab.set('operativo');
    this.editorMode.set('operativo');
  }

  askRemovePlan(plan: FloorPlan): void {
    if (!this.isAdmin) return;
    this.planToDelete.set(plan);
    this.deletePlanDialog.set(true);
  }

  closeDeletePlanDialog(): void {
    this.deletePlanDialog.set(false);
    this.planToDelete.set(null);
  }

  async confirmRemovePlan(): Promise<void> {
    const plan = this.planToDelete();
    if (!this.isAdmin || !plan) return;
    try {
      await this.floors.remove(plan.id);
      this.plans.update((current) => current.filter((item) => item.id !== plan.id));
      if (this.selectedPlan()?.id === plan.id) this.selectedPlan.set(null);
      this.closeDeletePlanDialog();
      this.toast.set('Plano eliminado');
    } catch (error) {
      this.toast.set(error instanceof Error ? error.message : 'No se pudo eliminar');
    }
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
      this.toast.set('Categoría creada');
    } catch (error) {
      this.toast.set(error instanceof Error ? error.message : 'No se pudo crear la categoría');
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
      this.toast.set('Producto añadido');
    } catch (error) {
      this.toast.set(error instanceof Error ? error.message : 'No se pudo crear el producto');
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
      this.categories.update((items) => items.map((item) => item.id === category.id ? { ...item, name } : item));
      this.closeEditCategory();
      this.toast.set('Nombre de categoría actualizado');
    } catch (error) {
      this.toast.set(error instanceof Error ? error.message : 'No se pudo actualizar la categoría');
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
      this.products.update((items) => items.map((item) => item.id === product.id ? { ...item, name } : item));
      this.closeEditProduct();
      this.toast.set('Nombre de producto actualizado');
    } catch (error) {
      this.toast.set(error instanceof Error ? error.message : 'No se pudo actualizar el producto');
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
      this.toast.set(error instanceof Error ? error.message : 'No se pudo comprobar el producto');
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
      this.toast.set(error instanceof Error ? error.message : 'No se pudo comprobar la categoría');
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
          this.catalogDeleteError.set('Este producto acaba de ser utilizado en un pedido y ya no puede eliminarse.');
          return;
        }
        this.products.update((items) => items.filter((item) => item.id !== product.id));
        this.toast.set('Producto eliminado');
      } else if (category) {
        const deleted = await this.product.deleteCategorySafe(category.id);
        if (!deleted) {
          this.catalogDeleteBlocked.set(true);
          this.catalogDeleteError.set('Algún producto de esta categoría acaba de ser utilizado en un pedido y la categoría ya no puede eliminarse.');
          return;
        }
        this.products.update((items) => items.filter((item) => item.category_id !== category.id));
        this.categories.update((items) => items.filter((item) => item.id !== category.id));
        delete this.newProductName[category.id];
        this.toast.set('Categoría eliminada');
      }
      this.closeCatalogDeleteDialog();
    } catch (error) {
      this.catalogDeleteError.set(error instanceof Error ? error.message : 'No se pudo eliminar');
    } finally {
      this.catalogDeleteChecking.set(false);
    }
  }

  async logout(): Promise<void> {
    // Cerramos los overlays antes de abandonar la sesión actual.
    this.resetTransientUi();
    this.channel?.unsubscribe?.();
    this.userOrderChannel?.unsubscribe?.();
    this.channel = null;
    this.userOrderChannel = null;
    try {
      await this.auth.signOut();
    } catch (error) {
      this.toast.set(error instanceof Error ? error.message : 'No se pudo cerrar la sesión');
      return;
    }
    // signOut() solo actualiza el estado de sesión; el guard de la ruta
    // únicamente se re-evalúa al navegar, así que sin esto el botón
    // "cerrar sesión" no hacía nada visible.
    await this.router.navigateByUrl('/login');
  }
}
