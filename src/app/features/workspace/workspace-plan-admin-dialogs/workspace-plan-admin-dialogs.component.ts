import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonInput, IonModal } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/auth/auth.service';
import type { FloorPlan } from '../../../core/models/models';
import { FloorPlanService, PlanDuplicationService } from '../../floor-plans';
import { defaultCopyPlanName } from '../workspace/workspace-transient.util';

/**
 * Owns create/copy/rename/delete plan dialog state.
 * Parent keeps plans list + navigation; receives toast / plansUpdated / planCreated.
 */
@Component({
  selector: 'app-workspace-plan-admin-dialogs',
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, IonInput, IonModal],
  templateUrl: './workspace-plan-admin-dialogs.component.html',
  styleUrl: './workspace-plan-admin-dialogs.component.scss',
})
export class WorkspacePlanAdminDialogsComponent {
  /** Current plans from shell — used to emit the next list after mutations. */
  @Input() plans: FloorPlan[] = [];

  @Output() toastMessage = new EventEmitter<string>();
  @Output() plansUpdated = new EventEmitter<FloorPlan[]>();
  @Output() planCreated = new EventEmitter<FloorPlan>();

  createPlanDialog = signal(false);
  newPlanName = '';
  copyPlanDialog = signal(false);
  planToCopy = signal<FloorPlan | null>(null);
  copyPlanName = '';
  renamePlanDialog = signal(false);
  planToRename = signal<FloorPlan | null>(null);
  renamePlanName = '';
  deletePlanDialog = signal(false);
  planToDelete = signal<FloorPlan | null>(null);

  constructor(
    private readonly auth: AuthService,
    private readonly floors: FloorPlanService,
    private readonly duplication: PlanDuplicationService,
  ) {}

  private get isAdmin(): boolean {
    return this.auth.hasRole('USER', 'ADMIN');
  }

  /** Public API for shell: open create-plan dialog. */
  openCreate(): void {
    this.newPlanName = '';
    this.createPlanDialog.set(true);
  }

  /** Public API for shell: open copy dialog for a plan. */
  askDuplicate(plan: FloorPlan): void {
    if (!this.isAdmin) return;
    this.planToCopy.set(plan);
    this.copyPlanName = defaultCopyPlanName(plan.name);
    this.copyPlanDialog.set(true);
  }

  /** Public API for shell: open rename dialog. */
  openRename(plan: FloorPlan): void {
    if (!this.isAdmin) return;
    this.planToRename.set(plan);
    this.renamePlanName = plan.name;
    this.renamePlanDialog.set(true);
  }

  /** Public API for shell: open delete confirmation. */
  askRemove(plan: FloorPlan): void {
    if (!this.isAdmin) return;
    this.planToDelete.set(plan);
    this.deletePlanDialog.set(true);
  }

  /** Clears overlays/forms — called from Workspace resetTransientUi / logout. */
  reset(): void {
    this.createPlanDialog.set(false);
    this.copyPlanDialog.set(false);
    this.renamePlanDialog.set(false);
    this.deletePlanDialog.set(false);
    this.newPlanName = '';
    this.copyPlanName = '';
    this.renamePlanName = '';
    this.planToCopy.set(null);
    this.planToRename.set(null);
    this.planToDelete.set(null);
  }

  closeCreatePlanDialog(): void {
    this.createPlanDialog.set(false);
    this.newPlanName = '';
  }

  async createPlan(): Promise<void> {
    if (!this.isAdmin) return;
    const name = this.newPlanName.trim();
    const companyId = this.auth.profile()?.company_id?.trim();
    if (!name) return;
    if (!companyId) {
      this.toastMessage.emit('No hay una empresa asociada a tu cuenta');
      return;
    }
    try {
      const plan = await this.floors.create(name, 2000, 1200, companyId);
      this.plansUpdated.emit([...this.plans, plan]);
      this.closeCreatePlanDialog();
      this.toastMessage.emit('Plano creado correctamente');
      this.planCreated.emit(plan);
    } catch (error) {
      this.toastMessage.emit(error instanceof Error ? error.message : 'No se pudo crear el plano');
    }
  }

  closeCopyDialog(): void {
    this.copyPlanDialog.set(false);
    this.planToCopy.set(null);
    this.copyPlanName = '';
  }

  async confirmDuplicate(): Promise<void> {
    const plan = this.planToCopy();
    const name = this.copyPlanName.trim();
    if (!this.isAdmin || !plan || !name) return;
    try {
      const copy = await this.duplication.duplicate(plan, name);
      this.plansUpdated.emit([...this.plans, copy].sort((a, b) => a.name.localeCompare(b.name)));
      this.closeCopyDialog();
      this.toastMessage.emit('Plano copiado correctamente');
    } catch (error) {
      this.toastMessage.emit(error instanceof Error ? error.message : 'No se pudo copiar el plano');
    }
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
      this.plansUpdated.emit(
        this.plans
          .map((item) => (item.id === plan.id ? { ...item, name } : item))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      this.closeRenamePlanDialog();
      this.toastMessage.emit('Nombre del plano actualizado');
    } catch (error) {
      this.toastMessage.emit(error instanceof Error ? error.message : 'No se pudo cambiar el nombre');
    }
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
      this.plansUpdated.emit(this.plans.filter((item) => item.id !== plan.id));
      this.closeDeletePlanDialog();
      this.toastMessage.emit('Plano eliminado');
    } catch (error) {
      this.toastMessage.emit(error instanceof Error ? error.message : 'No se pudo eliminar');
    }
  }
}
