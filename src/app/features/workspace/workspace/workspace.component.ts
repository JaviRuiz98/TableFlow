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
  IonSelect,
  IonSelectOption,
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

import type { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../../../core/auth/auth.service';
import { SupabaseService } from '../../../core/infrastructure';
import { FloorPlanService } from '../../floor-plans';
import { OrderService } from '../../orders';
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
export class WorkspaceComponent implements OnInit, OnDestroy {
  @ViewChild(PlanEditorComponent) private planEditor?: PlanEditorComponent;
  /** Template ref so tests can stub the child without matching the concrete class. */
  @ViewChild('userAdmin') private userAdminPanel?: WorkspaceUserAdminComponent;
  @ViewChild('planAdmin') private planAdminDialogs?: WorkspacePlanAdminDialogsComponent;
  @ViewChild('catalogPanel') private catalogPanel?: WorkspaceCatalogPanelComponent;

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

  private channel: RealtimeChannel | null = null;
  private userOrderChannel: RealtimeChannel | null = null;

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
    private notifications: OrderNotificationService,
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

  /** Role gates for tabs/actions (characterization + template parity). */
  get shellVisibility() {
    return workspaceShellVisibility(this.isAdmin);
  }

  async ngOnInit(): Promise<void> {
    // Una sesión nueva siempre parte con todos los overlays cerrados.
    this.resetTransientUi();
    try {
      this.plans.set(await this.floors.list());
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
    if (match.name !== selected.name) {
      this.selectedPlan.set({ ...selected, name: match.name });
    }
  }

  onPlanCreated(plan: FloorPlan): void {
    this.selectedPlan.set(plan);
    this.editorMode.set('editor');
    this.showMap.set(true);
    this.activeTab.set('operativo');
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
    this.planAdminDialogs?.askDuplicate(plan);
  }

  openRenamePlanDialog(plan: FloorPlan): void {
    this.planAdminDialogs?.openRename(plan);
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
