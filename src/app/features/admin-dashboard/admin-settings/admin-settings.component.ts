import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { AdminCompanyContextService } from '../admin-company-context.service';
import { AdminMetricsService } from '../admin-metrics.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.scss',
})
export class AdminSettingsComponent implements OnInit {
  readonly companyName = this.companyCtx.companyName;

  readonly editingCompany = signal(false);
  readonly savingCompany = signal(false);
  readonly draftCompanyName = signal('');
  readonly companyFeedback = signal('');
  readonly companyFeedbackKind = signal<'ok' | 'err' | ''>('');

  readonly editingAdmin = signal(false);
  readonly savingAdmin = signal(false);
  readonly draftAdminName = signal('');
  readonly draftPhone = signal('');
  readonly draftEmail = signal('');
  readonly adminFeedback = signal('');
  readonly adminFeedbackKind = signal<'ok' | 'err' | ''>('');

  readonly adminName = signal('—');
  readonly phone = signal('—');
  readonly email = signal('—');

  constructor(
    private readonly auth: AuthService,
    private readonly metrics: AdminMetricsService,
    private readonly companyCtx: AdminCompanyContextService,
  ) {}

  ngOnInit(): void {
    this.hydrateAdminFromAuth();
    void this.ensureCompany();
  }

  startEditCompany(): void {
    this.draftCompanyName.set(this.companyName());
    this.companyFeedback.set('');
    this.companyFeedbackKind.set('');
    this.editingCompany.set(true);
  }

  cancelEditCompany(): void {
    this.editingCompany.set(false);
    this.draftCompanyName.set('');
    this.companyFeedback.set('');
    this.companyFeedbackKind.set('');
  }

  async saveCompanyName(): Promise<void> {
    if (this.savingCompany()) return;
    this.savingCompany.set(true);
    this.companyFeedback.set('');
    this.companyFeedbackKind.set('');
    try {
      const saved = await this.metrics.updateCompanyName(this.draftCompanyName());
      this.editingCompany.set(false);
      this.companyFeedbackKind.set('ok');
      this.companyFeedback.set(`Nombre actualizado: ${saved}`);
    } catch (error) {
      this.companyFeedbackKind.set('err');
      this.companyFeedback.set(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      this.savingCompany.set(false);
    }
  }

  startEditAdmin(): void {
    this.draftAdminName.set(this.adminName() === '—' ? '' : this.adminName());
    this.draftPhone.set(
      this.phone() === '—' || this.phone() === 'No registrado' ? '' : this.phone(),
    );
    this.draftEmail.set(
      this.email() === '—' || this.email() === 'No disponible' ? '' : this.email(),
    );
    this.adminFeedback.set('');
    this.adminFeedbackKind.set('');
    this.editingAdmin.set(true);
  }

  cancelEditAdmin(): void {
    this.editingAdmin.set(false);
    this.draftAdminName.set('');
    this.draftPhone.set('');
    this.draftEmail.set('');
    this.adminFeedback.set('');
    this.adminFeedbackKind.set('');
  }

  async saveAdmin(): Promise<void> {
    if (this.savingAdmin()) return;
    this.savingAdmin.set(true);
    this.adminFeedback.set('');
    this.adminFeedbackKind.set('');
    try {
      const profileSaved = await this.metrics.updateOwnAdminProfile({
        fullName: this.draftAdminName(),
        phone: this.draftPhone(),
      });
      this.adminName.set(profileSaved.fullName);
      this.phone.set(profileSaved.phone);

      try {
        const emailResult = await this.auth.updateAccountEmail(this.draftEmail());
        this.email.set(emailResult.email || this.draftEmail().trim().toLowerCase());
        this.editingAdmin.set(false);
        this.adminFeedbackKind.set('ok');
        this.adminFeedback.set(
          emailResult.confirmationRequired
            ? 'Datos guardados. Revisa el nuevo correo para confirmar el cambio de email.'
            : 'Datos del administrador actualizados.',
        );
      } catch (emailError) {
        this.editingAdmin.set(false);
        this.adminFeedbackKind.set('err');
        this.adminFeedback.set(
          `Nombre y teléfono guardados, pero el correo no: ${
            emailError instanceof Error ? emailError.message : 'error desconocido'
          }`,
        );
      }
    } catch (error) {
      this.hydrateAdminFromAuth();
      this.adminFeedbackKind.set('err');
      this.adminFeedback.set(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      this.savingAdmin.set(false);
    }
  }

  private hydrateAdminFromAuth(): void {
    const profile = this.auth.profile();
    this.adminName.set(profile?.full_name?.trim() || '—');
    this.phone.set(profile?.phone?.trim() || 'No registrado');
    const authEmail = this.auth.session()?.user?.email?.trim();
    this.email.set(authEmail || 'No disponible');
  }

  private async ensureCompany(): Promise<void> {
    if (this.companyCtx.companyId()) return;
    await this.metrics.loadOverview();
  }
}
