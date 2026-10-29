import { Component, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  IonSelect,
  IonSelectOption,
  ViewWillEnter,
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
  arrowBackOutline,
} from 'ionicons/icons';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../../../core/auth/auth.service';
import { TABLEFLOW_DEFAULT_BRANDING } from '../../../core/branding';
import { SupabaseService } from '../../../core/infrastructure';
import {
  clearSetupIntent,
  OnboardingService,
  resolveSetupIntent,
  TF_SETUP_QUERY,
  type OnboardingStepId,
} from '../../onboarding';
import { FloorPlanService } from '../../floor-plans';
import { OrderService } from '../../orders';
import { ProductService } from '../../products';
import { OrderNotificationService } from '../../notifications';
import type { ClubTable, FloorPlan } from '../../../core/models/models';
import { PlanEditorComponent, TableProductPanelComponent } from '../../floor-editor';
import { NEW_OBSERVATION_ALERT, NEW_ORDER_ALERT } from '../workspace-user-alert-modal/workspace-alerts.util';
import { initialWorkspacePresentation } from './workspace-init.util';
import { emptyWorkspaceTransientUi } from './workspace-transient.util';
import { workspaceShellVisibility } from './workspace-shell-visibility.util';
import { WorkspaceUserAdminComponent } from '../workspace-user-admin/workspace-user-admin.component';
import { WorkspacePlanAdminDialogsComponent } from '../workspace-plan-admin-dialogs/workspace-plan-admin-dialogs.component';
import { WorkspaceCatalogPanelComponent } from '../workspace-catalog-panel/workspace-catalog-panel.component';
import { WorkspaceUserAlertModalComponent } from '../workspace-user-alert-modal/workspace-user-alert-modal.component';

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
    IonSelect,
    IonSelectOption,
    PlanEditorComponent,
    TableProductPanelComponent,
    WorkspaceUserAdminComponent,
    WorkspacePlanAdminDialogsComponent,
    WorkspaceCatalogPanelComponent,
    WorkspaceUserAlertModalComponent,
  ],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
})
export class WorkspaceComponent implements OnInit, OnDestroy, ViewWillEnter {
  @ViewChild(PlanEditorComponent) private planEditor?: PlanEditorComponent;
  /** Template ref so tests can stub the child without matching the concrete class. */
  @ViewChild('userAdmin') private userAdminPanel?: WorkspaceUserAdminComponent;
  @ViewChild('planAdmin') private planAdminDialogs?: WorkspacePlanAdminDialogsComponent;
  @ViewChild('catalogPanel') private catalogPanel?: WorkspaceCatalogPanelComponent;

  readonly branding = TABLEFLOW_DEFAULT_BRANDING;
  readonly planSelectOptions = {
    cssClass: 'tf-plan-select-popover',
  };

  activeTab = signal<'planos' | 'operativo' | 'productos'>('planos');
  editorMode = signal<'editor' | 'operativo'>('editor');
  showMap = signal(true);
  plans = signal<FloorPlan[]>([]);
  selectedPlan = signal<FloorPlan | null>(null);
  pendingCount = signal(0);
  toast = signal('');
  configured = true;
  newOrderAlert = signal(false);
  userAlertTitle = signal(NEW_ORDER_ALERT.title);
  userAlertEyebrow = signal(NEW_ORDER_ALERT.eyebrow);
  userAlertMessage = signal(NEW_ORDER_ALERT.message);
  /** Guided setup shell (hide workspace chrome; step-scoped content). */
  onboardingMode = signal(false);
  savingOnboardingPlan = signal(false);
  finishingOnboardingProducts = signal(false);

  private channel: RealtimeChannel | null = null;
  private userOrderChannel: RealtimeChannel | null = null;
  private workspaceDataReady = false;
  setupIntent: OnboardingStepId | null = null;

  /**
   * Limpia cualquier estado visual transitorio para que una nueva sesión
   * nunca herede diálogos, formularios ni avisos de la sesión anterior.
   */
  private resetTransientUi(): void {
    const ui = emptyWorkspaceTransientUi();
    this.newOrderAlert.set(ui.newOrderAlert);
    this.userAlertTitle.set(ui.userAlertTitle);
    this.userAlertEyebrow.set(ui.userAlertEyebrow);
    this.userAlertMessage.set(ui.userAlertMessage);
    this.toast.set(ui.toast);
    this.planAdminDialogs?.reset();
    this.catalogPanel?.reset();
    this.userAdminPanel?.reset();
  }

  constructor(
    private auth: AuthService,
    private floors: FloorPlanService,
    private orders: OrderService,
    private products: ProductService,
    private notifications: OrderNotificationService,
    private supabase: SupabaseService,
    private router: Router,
    private route: ActivatedRoute,
    private onboarding: OnboardingService,
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
      arrowBackOutline,
    });
    this.configured = this.supabase.configured;
  }

  get isAdmin(): boolean {
    return this.auth.hasRole('ADMIN');
  }

  /** Day-to-day management (former ADMIN shell). */
  get isManager(): boolean {
    return this.auth.hasRole('USER');
  }

  get isReceptor(): boolean {
    return this.auth.hasRole('RECEPTOR');
  }

  /** USER day-to-day management; ADMIN retains operativa inside /sala (+ onboarding). */
  get canManageFloor(): boolean {
    return this.isManager || this.isAdmin;
  }

  /** Role gates for tabs/actions (characterization + template parity). */
  get shellVisibility() {
    return workspaceShellVisibility({
      isAdmin: this.isAdmin,
      isManager: this.isManager,
      isReceptor: this.isReceptor,
    });
  }

  /** Hide Planos/Operativa/Productos bar when only one tab exists (e.g. RECEPTOR). */
  get showShellTabs(): boolean {
    const v = this.shellVisibility;
    const count =
      Number(v.showPlanosTab) + Number(v.showOperativaTab) + Number(v.showProductosTab);
    return count > 1;
  }

  onboardingStepLabel(): string {
    if (this.setupIntent === 'plan') return 'Crear primer plano';
    if (this.setupIntent === 'products') return 'Configurar productos';
    if (this.setupIntent === 'users') return 'Configurar usuarios';
    return 'Configuración inicial';
  }

  onboardingProgressLabel(): string {
    const progress = this.onboarding.progress();
    return `${progress.completedCount} de 3 completados`;
  }

  async ngOnInit(): Promise<void> {
    // Una sesión nueva siempre parte con todos los overlays cerrados.
    this.resetTransientUi();
    await this.bootstrapWorkspace();
  }

  /**
   * ion-router-outlet caches this page. Re-enter after /onboarding must
   * re-apply guided shell (return CTA + hidden tabs) — ngOnInit alone won't.
   */
  ionViewWillEnter(): void {
    if (!this.workspaceDataReady) return;
    void this.reenterWorkspace();
  }

  private async reenterWorkspace(): Promise<void> {
    try {
      this.plans.set(await this.floors.list());
    } catch {
      // Keep the previous list; shell sync still proceeds.
    }
    await this.syncOnboardingShell({ applyIntent: true });
  }

  ngOnDestroy(): void {
    this.channel?.unsubscribe?.();
    this.userOrderChannel?.unsubscribe?.();
  }

  /**
   * Resolve setup intent + company flags and toggle guided chrome.
   * Tab/intent are applied synchronously first so a cached operativo view
   * cannot flash when re-entering for products/users.
   */
  private async syncOnboardingShell(options?: { applyIntent?: boolean }): Promise<void> {
    this.setupIntent = resolveSetupIntent(this.route.snapshot.queryParamMap.get(TF_SETUP_QUERY));

    // Keep guided chrome on immediately when arriving from an onboarding CTA
    // (before awaiting refresh) so operational tabs never flash.
    if (this.isAdmin && this.setupIntent) {
      this.onboardingMode.set(true);
      this.applySetupIntentTabs();
    }

    if (this.isAdmin) {
      await this.onboarding.refresh().catch(() => undefined);
    }
    const guided = this.isAdmin && (this.onboarding.isInitialSetup() || !!this.setupIntent);
    this.onboardingMode.set(guided);
    if (guided && options?.applyIntent) {
      await this.applySetupIntent();
    }
  }

  /** Switch visible tab for the current setup intent without awaiting I/O. */
  private applySetupIntentTabs(): void {
    if (!this.setupIntent) return;
    if (this.setupIntent === 'plan') {
      this.activeTab.set(this.plans().length ? 'operativo' : 'planos');
      return;
    }
    if (this.setupIntent === 'products') {
      this.activeTab.set('productos');
      return;
    }
    // users: no plan/catalog surface — stay off operativo/planos
    this.activeTab.set('productos');
  }

  private async bootstrapWorkspace(): Promise<void> {
    try {
      await this.syncOnboardingShell({ applyIntent: false });

      this.plans.set(await this.floors.list());
      if (this.onboardingMode()) {
        // Guided entry: never inherit a default operativa presentation.
        this.applySetupIntentTabs();
        if (this.setupIntent === 'plan' && this.plans().length) {
          this.selectedPlan.set(this.plans()[0]);
          this.editorMode.set('editor');
          this.showMap.set(true);
        } else if (this.setupIntent !== 'plan') {
          this.selectedPlan.set(null);
        }
      } else {
        const presentation = initialWorkspacePresentation(
          {
            isAdmin: this.isAdmin,
            isManager: this.isManager,
            isReceptor: this.isReceptor,
          },
          this.plans(),
        );
        this.activeTab.set(presentation.activeTab);
        this.editorMode.set(presentation.editorMode);
        this.showMap.set(presentation.showMap);
        this.selectedPlan.set(presentation.selectedPlan);
        const tabParam = this.route.snapshot.queryParamMap.get('tab');
        if (tabParam === 'planos' || tabParam === 'operativo' || tabParam === 'productos') {
          this.activeTab.set(tabParam);
        }
        if (presentation.subscribeReceptorOrderAlerts) {
          this.userOrderChannel = this.notifications.subscribeToNewOrderItems(
            () => this.showUserAlert(NEW_ORDER_ALERT),
            () => this.showUserAlert(NEW_OBSERVATION_ALERT),
          );
        }
        this.channel = this.orders.subscribe(() => this.refreshOperationalData(), 'workspace-orders');
      }
      this.workspaceDataReady = true;
      await this.applySetupIntent();
    } catch (error) {
      this.toast.set(error instanceof Error ? error.message : 'Error cargando datos');
    }
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
    if (!this.canManageFloor) return;

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
    if (!this.canManageFloor || this.editorMode() !== 'operativo') return;
    this.showMap.update((visible) => !visible);
  }

  openCreatePlanDialog(): void {
    this.planAdminDialogs?.openCreate();
  }

  openUserAccessDialog(): void {
    if (!this.isAdmin) {
      this.toast.set('Solo los administradores pueden gestionar usuarios');
      return;
    }
    this.userAdminPanel?.openAccess();
  }

  onChildToast(message: string): void {
    this.toast.set(message);
  }

  /** Alias used by characterization specs / user-admin wiring. */
  onUserAdminToast(message: string): void {
    this.onChildToast(message);
  }

  onPlansUpdated(plans: FloorPlan[]): void {
    this.plans.set(plans);
    const selected = this.selectedPlan();
    if (!selected) return;
    const match = plans.find((item) => item.id === selected.id);
    if (!match) {
      this.selectedPlan.set(null);
      return;
    }
    this.selectedPlan.set(match);
  }

  formatPlanDate(plan: FloorPlan): string {
    const [y, m, d] = (plan.opening_date || '').split('-').map(Number);
    if (!y || !m || !d) return plan.opening_date || 'Sin fecha';
    try {
      const formatted = new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date(y, m - 1, d));
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return plan.opening_date;
    }
  }

  formatPlanHours(plan: FloorPlan): string {
    const opens = (plan.opens_at || '').slice(0, 5);
    const closes = (plan.closes_at || '').slice(0, 5);
    if (!opens || !closes) return 'Sin horario';
    const suffix = plan.closes_next_day ? ' (+1)' : '';
    return `${opens} – ${closes}${suffix}`;
  }

  formatPlanSchedule(plan: FloorPlan): string {
    return `${this.formatPlanDate(plan)} · ${this.formatPlanHours(plan)}`;
  }

  onPlanCreated(plan: FloorPlan): void {
    this.selectedPlan.set(plan);
    this.editorMode.set('editor');
    this.showMap.set(true);
    this.activeTab.set('operativo');
    // Onboarding: stay in the editor until the design is saved explicitly.
  }

  async returnToOnboarding(): Promise<void> {
    if (this.onboardingMode() && this.setupIntent === 'plan' && this.hasUnsavedPlanEdits()) {
      const leave = window.confirm(
        'Hay cambios en el editor que quizá no se hayan guardado. ¿Volver a la configuración igual?',
      );
      if (!leave) return;
    }

    clearSetupIntent();
    this.setupIntent = null;
    // Keep guided chrome on while navigating away so operational tabs never flash.
    this.resetGuidedSurface();
    await this.router.navigateByUrl('/onboarding');
  }

  async saveOnboardingPlanAndContinue(): Promise<void> {
    if (!this.onboardingMode() || this.setupIntent !== 'plan' || !this.selectedPlan()) return;
    this.savingOnboardingPlan.set(true);
    try {
      const saved = await this.planEditor?.saveDesign(false);
      if (saved === false) {
        this.toast.set('No se pudo guardar el diseño del plano.');
        return;
      }
      const plans = await this.floors.list();
      this.plans.set(plans);
      if (!plans.some((item) => item.id === this.selectedPlan()?.id)) {
        this.toast.set('El plano no se encontró tras guardar. Inténtalo de nuevo.');
        return;
      }
      await this.onboarding.markStepDone('plan');
      await this.completeOnboardingStepAndReturn();
    } catch (error) {
      this.toast.set(error instanceof Error ? error.message : 'No se pudo guardar el plano');
    } finally {
      this.savingOnboardingPlan.set(false);
    }
  }

  /** Creating a product no longer completes the step — only validates tenancy. */
  onOnboardingProductCreated(product: { id: string; company_id: string | null }): void {
    if (!this.onboardingMode() || this.setupIntent !== 'products') return;
    const companyId = this.auth.profile()?.company_id ?? null;
    if (!product.company_id || !companyId || product.company_id !== companyId) {
      this.toast.set('El producto no quedó asociado a tu empresa.');
    }
  }

  /** Explicit finish CTA: mark products flag and return to onboarding checklist. */
  async finishOnboardingProducts(): Promise<void> {
    if (!this.onboardingMode() || this.setupIntent !== 'products') return;
    this.finishingOnboardingProducts.set(true);
    try {
      const list = await this.products.products();
      if (!list.length) {
        this.toast.set('Añade al menos un producto antes de finalizar.');
        return;
      }
      await this.onboarding.markStepDone('products');
      await this.completeOnboardingStepAndReturn();
    } catch (error) {
      this.toast.set(error instanceof Error ? error.message : 'No se pudo finalizar productos');
    } finally {
      this.finishingOnboardingProducts.set(false);
    }
  }

  async onOnboardingUserCreated(): Promise<void> {
    if (!this.onboardingMode() || this.setupIntent !== 'users') return;
    try {
      await this.onboarding.markStepDone('users');
      await this.completeOnboardingStepAndReturn();
    } catch (error) {
      this.toast.set(
        error instanceof Error
          ? error.message
          : 'No se pudo marcar el paso de usuarios. Revisa migración 0019 / create-user si el staff no tiene company_id.',
      );
    }
  }

  private async applySetupIntent(): Promise<void> {
    if (!this.isAdmin || !this.setupIntent || !this.workspaceDataReady) return;

    this.applySetupIntentTabs();

    if (this.setupIntent === 'plan') {
      if (this.plans().length) {
        this.selectedPlan.set(this.plans()[0]);
        this.editorMode.set('editor');
        this.showMap.set(true);
      } else {
        this.selectedPlan.set(null);
        void Promise.resolve().then(() => this.openCreatePlanDialog());
      }
      return;
    }

    // products / users: never leave a plan editor visible behind the step
    this.selectedPlan.set(null);
    if (this.setupIntent === 'users') {
      void Promise.resolve().then(() => this.openUserAccessDialog());
    }
  }

  /** Neutral surface so a cached plan step cannot leak into the next intent. */
  private resetGuidedSurface(): void {
    this.selectedPlan.set(null);
    this.activeTab.set('planos');
    this.editorMode.set('editor');
  }

  private async completeOnboardingStepAndReturn(): Promise<void> {
    try {
      await this.onboarding.refresh();
    } catch {
      // Still return; onboarding screen will refresh again.
    }
    clearSetupIntent();
    this.setupIntent = null;
    // Keep guided chrome on while navigating away so operational tabs never flash.
    this.resetGuidedSurface();
    await this.router.navigateByUrl('/onboarding');
  }

  private hasUnsavedPlanEdits(): boolean {
    const editor = this.planEditor as { historyIndex?: number } | undefined;
    return typeof editor?.historyIndex === 'number' && editor.historyIndex > 0;
  }

  openPlan(plan: FloorPlan): void {
    this.selectedPlan.set(plan);
    this.editorMode.set('operativo');
    this.showMap.set(this.canManageFloor);
    this.activeTab.set('operativo');
  }

  goToAdminDashboard(): void {
    void this.router.navigateByUrl('/admin');
  }
  openEditor(plan: FloorPlan): void {
    if (!this.canManageFloor) return;
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
    this.planAdminDialogs?.askDuplicate(plan);
  }

  openRenamePlanDialog(plan: FloorPlan): void {
    this.planAdminDialogs?.openRename(plan);
  }

  openEditScheduleDialog(plan: FloorPlan): void {
    this.planAdminDialogs?.openEditSchedule(plan);
  }

  askRemovePlan(plan: FloorPlan): void {
    this.planAdminDialogs?.askRemove(plan);
  }

  acknowledgeNewOrder(): void {
    this.newOrderAlert.set(false);
    this.activeTab.set('operativo');
    this.editorMode.set('operativo');
  }

  async logout(): Promise<void> {
    // Cerramos los overlays antes de abandonar la sesión actual.
    this.resetTransientUi();
    clearSetupIntent();
    this.setupIntent = null;
    this.onboardingMode.set(false);
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
