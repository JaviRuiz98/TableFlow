import { NgStyle } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/auth/auth.service';
import { TABLEFLOW_DEFAULT_BRANDING } from '../../../core/branding';

@Component({
  selector: 'app-registro-empresa-pendiente',
  standalone: true,
  imports: [NgStyle, RouterLink, IonContent, IonButton, IonSpinner],
  template: `
    <ion-content [fullscreen]="true" class="status-page">
      <main class="status-shell" [ngStyle]="brandCssVars()">
        <div class="status-ambiance" aria-hidden="true"></div>
        <section class="status-card">
          <img class="brand-logo" [src]="branding.assets.logoCompactUrl" [alt]="branding.productName" width="64" height="52" />
          <h1>Revisa tu correo</h1>
          <p class="copy">
            Revisa tu correo para activar tu cuenta
            @if (email()) {
              (<strong>{{ email() }}</strong>)
            }.
            Tu empresa ya está registrada; solo falta confirmar el email para poder iniciar sesión.
          </p>
          @if (message()) {
            <p class="status-message" role="status">{{ message() }}</p>
          }
          <ion-button class="secondary-button" expand="block" fill="outline" type="button" [disabled]="resending()" (click)="resend()">
            @if (resending()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              Reenviar correo
            }
          </ion-button>
          <ion-button class="primary-button" expand="block" routerLink="/login">Ir al acceso</ion-button>
        </section>
      </main>
    </ion-content>
  `,
  styleUrl: './registro-empresa-status.shared.scss',
})
export class RegistroEmpresaPendienteComponent implements OnInit {
  readonly branding = TABLEFLOW_DEFAULT_BRANDING;
  readonly email = signal('');
  readonly message = signal('');
  readonly resending = signal(false);

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.email.set((this.route.snapshot.queryParamMap.get('email') ?? '').trim());
  }

  brandCssVars(): Record<string, string> {
    const { colors } = this.branding;
    return {
      '--tf-brand-primary': colors.primary,
      '--tf-brand-surface-muted': colors.surfaceMuted,
      '--tf-brand-text': colors.text,
      '--tf-brand-text-muted': colors.textMuted,
      '--tf-brand-on-primary': colors.onPrimary,
      '--tf-brand-danger': colors.danger,
    };
  }

  async resend(): Promise<void> {
    const target = this.email();
    if (!target || this.resending()) return;
    this.resending.set(true);
    this.message.set('');
    try {
      await this.auth.resendCompanySignupEmail(target);
      this.message.set('Si el correo es válido, recibirás un nuevo enlace en breve.');
    } catch (e) {
      this.message.set(e instanceof Error ? e.message : 'No se pudo reenviar el correo.');
    } finally {
      this.resending.set(false);
    }
  }
}
