import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonDatetime,
  IonDatetimeButton,
  IonInput,
  IonModal,
  IonPopover,
} from '@ionic/angular/standalone';
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
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonDatetime,
    IonDatetimeButton,
    IonInput,
    IonModal,
    IonPopover,
  ],
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
  newOpeningDate = '';
  newOpensAt = '22:00';
  newClosesAt = '06:00';
  newClosesNextDay = true;
  newSourcePlanId = '';
  readonly distribucionTooltip =
    'Se copiará solo la distribución (mesas, reservados y elementos). Las nuevas mesas tendrán UUID propios y empezarán sin reserva, sin ocupación y sin pedidos.';
  copyPlanDialog = signal(false);
  planToCopy = signal<FloorPlan | null>(null);
  copyPlanName = '';
  renamePlanDialog = signal(false);
  planToRename = signal<FloorPlan | null>(null);
  renamePlanName = '';
  deletePlanDialog = signal(false);
  planToDelete = signal<FloorPlan | null>(null);
  scheduleIncoherentDialog = signal(false);
  scheduleIncoherentContext = signal<'create' | 'edit'>('create');

  editScheduleDialog = signal(false);
  planToEditSchedule = signal<FloorPlan | null>(null);
  editOpeningDate = '';
  editOpensAt = '22:00';
  editClosesAt = '06:00';
  editClosesNextDay = true;
  /** Inline time wheel (avoids nested modal/popover gesture bugs). */
  timeWheelOpen = signal<'create-opens' | 'create-closes' | 'edit-opens' | 'edit-closes' | null>(null);

  constructor(
    private readonly auth: AuthService,
    private readonly floors: FloorPlanService,
    private readonly duplication: PlanDuplicationService,
  ) {}

  private get isAdmin(): boolean {
    return this.auth.hasRole('USER', 'ADMIN');
  }

  get canSubmitJornada(): boolean {
    return (
      this.newPlanName.trim().length >= 2 &&
      !!this.newOpeningDate &&
      !!this.newOpensAt &&
      !!this.newClosesAt
    );
  }

  /** Public API for shell: open create-plan dialog. */
  openCreate(): void {
    this.newPlanName = '';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.newOpeningDate = tomorrow.toISOString().slice(0, 10);
    this.newOpensAt = '22:00';
    this.newClosesAt = '06:00';
    this.newClosesNextDay = true;
    this.newSourcePlanId = '';
    this.timeWheelOpen.set(null);
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

  /** Public API for shell: edit jornada date/times. */
  openEditSchedule(plan: FloorPlan): void {
    if (!this.isAdmin) return;
    this.planToEditSchedule.set(plan);
    this.editOpeningDate = plan.opening_date;
    this.editOpensAt = (plan.opens_at || '22:00').slice(0, 5);
    this.editClosesAt = (plan.closes_at || '06:00').slice(0, 5);
    this.editClosesNextDay = !!plan.closes_next_day;
    this.timeWheelOpen.set(null);
    this.editScheduleDialog.set(true);
  }

  /** Clears overlays/forms — called from Workspace resetTransientUi / logout. */
  reset(): void {
    this.createPlanDialog.set(false);
    this.copyPlanDialog.set(false);
    this.renamePlanDialog.set(false);
    this.deletePlanDialog.set(false);
    this.scheduleIncoherentDialog.set(false);
    this.editScheduleDialog.set(false);
    this.timeWheelOpen.set(null);
    this.newPlanName = '';
    this.copyPlanName = '';
    this.renamePlanName = '';
    this.planToCopy.set(null);
    this.planToRename.set(null);
    this.planToDelete.set(null);
    this.planToEditSchedule.set(null);
  }

  closeCreatePlanDialog(): void {
    this.createPlanDialog.set(false);
    this.scheduleIncoherentDialog.set(false);
    this.timeWheelOpen.set(null);
    this.newPlanName = '';
    this.newSourcePlanId = '';
  }

  toggleTimeWheel(id: 'create-opens' | 'create-closes' | 'edit-opens' | 'edit-closes'): void {
    this.timeWheelOpen.update((current) => (current === id ? null : id));
  }

  /** True when close time is earlier than open time on the same calendar day. */
  private isSameDayCloseBeforeOpen(opensAt: string, closesAt: string, closesNextDay: boolean): boolean {
    if (closesNextDay) return false;
    const open = this.timeToMinutes(opensAt);
    const close = this.timeToMinutes(closesAt);
    if (open == null || close == null) return false;
    return close < open;
  }

  private timeToMinutes(value: string): number | null {
    const match = /^(\d{1,2}):(\d{2})/.exec((value || '').trim());
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) return null;
    return h * 60 + m;
  }

  private toTime(value: string): string {
    return value.length === 5 ? `${value}:00` : value;
  }

  /** ISO value for ion-datetime presentation="time" from HH:mm. */
  timeToIso(hhmm: string): string {
    const t = (hhmm || '00:00').slice(0, 5);
    return `1970-01-01T${t}:00`;
  }

  /** Persist HH:mm from ion-datetime time value (ISO or HH:mm). */
  onTimeModelChange(value: string | string[] | null | undefined, target: 'newOpens' | 'newCloses' | 'editOpens' | 'editCloses'): void {
    const raw = Array.isArray(value) ? value[0] : value;
    const match = raw ? /(?:T|^)(\d{2}:\d{2})/.exec(raw) : null;
    const next = match?.[1] ?? '00:00';
    switch (target) {
      case 'newOpens':
        this.newOpensAt = next;
        break;
      case 'newCloses':
        this.newClosesAt = next;
        break;
      case 'editOpens':
        this.editOpensAt = next;
        break;
      case 'editCloses':
        this.editClosesAt = next;
        break;
    }
  }

  onDateModelChange(
    value: string | string[] | null | undefined,
    target: 'newOpening' | 'editOpening',
  ): void {
    const raw = Array.isArray(value) ? value[0] : value;
    const next = (raw || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return;
    if (target === 'newOpening') this.newOpeningDate = next;
    else this.editOpeningDate = next;
  }

  closeScheduleIncoherentDialog(): void {
    this.scheduleIncoherentDialog.set(false);
  }

  /** Marks closes-next-day and retries create or edit. */
  async fixClosesNextDayAndContinue(): Promise<void> {
    this.scheduleIncoherentDialog.set(false);
    if (this.scheduleIncoherentContext() === 'edit') {
      this.editClosesNextDay = true;
      await this.confirmEditSchedule();
      return;
    }
    this.newClosesNextDay = true;
    await this.createPlan();
  }

  async createPlan(): Promise<void> {
    if (!this.isAdmin || !this.canSubmitJornada) return;
    if (this.isSameDayCloseBeforeOpen(this.newOpensAt, this.newClosesAt, this.newClosesNextDay)) {
      this.scheduleIncoherentContext.set('create');
      this.scheduleIncoherentDialog.set(true);
      return;
    }
    const name = this.newPlanName.trim();
    const companyId = this.auth.profile()?.company_id?.trim();
    if (!companyId) {
      this.toastMessage.emit('No hay una empresa asociada a tu cuenta');
      return;
    }
    try {
      const plan = await this.floors.createOpeningJornada({
        name,
        openingDate: this.newOpeningDate,
        opensAt: this.toTime(this.newOpensAt),
        closesAt: this.toTime(this.newClosesAt),
        closesNextDay: this.newClosesNextDay,
        sourceFloorPlanId: this.newSourcePlanId || null,
      });
      this.plansUpdated.emit([plan, ...this.plans]);
      this.closeCreatePlanDialog();
      this.toastMessage.emit('Jornada creada correctamente');
      this.planCreated.emit(plan);
    } catch (error) {
      this.toastMessage.emit(error instanceof Error ? error.message : 'No se pudo crear la jornada');
    }
  }

  closeEditScheduleDialog(): void {
    this.editScheduleDialog.set(false);
    this.planToEditSchedule.set(null);
    this.timeWheelOpen.set(null);
  }

  get canSubmitScheduleEdit(): boolean {
    return !!this.editOpeningDate && !!this.editOpensAt && !!this.editClosesAt;
  }

  async confirmEditSchedule(): Promise<void> {
    const plan = this.planToEditSchedule();
    if (!this.isAdmin || !plan || !this.canSubmitScheduleEdit) return;
    if (this.isSameDayCloseBeforeOpen(this.editOpensAt, this.editClosesAt, this.editClosesNextDay)) {
      this.scheduleIncoherentContext.set('edit');
      this.scheduleIncoherentDialog.set(true);
      return;
    }
    try {
      const patch = {
        opening_date: this.editOpeningDate,
        opens_at: this.toTime(this.editOpensAt),
        closes_at: this.toTime(this.editClosesAt),
        closes_next_day: this.editClosesNextDay,
      };
      await this.floors.update(plan.id, patch);
      this.plansUpdated.emit(
        this.plans.map((item) => (item.id === plan.id ? { ...item, ...patch } : item)),
      );
      this.closeEditScheduleDialog();
      this.toastMessage.emit('Fecha y horario actualizados');
    } catch (error) {
      this.toastMessage.emit(error instanceof Error ? error.message : 'No se pudo guardar el horario');
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
