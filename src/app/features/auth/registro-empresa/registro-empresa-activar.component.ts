import { NgStyle } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/auth/auth.service';
import { TABLEFLOW_DEFAULT_BRANDING } from '../../../core/branding';

type ConfirmPhase = 'loading' | 'confirmed' | 'error';

/**
 * Email-confirm landing page only.
 * Company + ADMIN profile are created at signUp (handle_new_user) — this screen
 * must not insert into companies/profiles.
 */
@Component({
  selector: 'app-registro-empresa-activar',
  standalone: true,
  imports: [NgStyle, RouterLink, IonContent, IonButton, IonSpinner],
  template: `
    <ion-content [fullscreen]="true" class="status-page">
      <main class="status-shell" [ngStyle]="brandCssVars()">
        <div class="status-ambiance" aria-hidden="true"></div>
        <section class="status-card">
          <img class="brand-logo" [src]="branding.assets.logoCompactUrl" [alt]="branding.productName" width="64" height="52" />

          @switch (phase()) {
            @case ('loading') {
              <h1>Confirmando correo</h1>
              <p class="copy">Estamos verificando el enlace de confirmación…</p>
              <ion-spinner name="crescent" class="page-spinner"></ion-spinner>
            }
            @case ('confirmed') {
              <h1>¡Correo electrónico confirmado!</h1>
              <p class="copy">
                Tu cuenta ya está activada. Ya puedes iniciar sesión en TableFlow con el correo y la contraseña de tu
                registro.
              </p>
              <ion-button class="primary-button" expand="block" routerLink="/login">Iniciar sesión</ion-button>
            }
            @case ('error') {
              <h1>No se pudo confirmar</h1>
              <p class="copy error-copy">{{ error() }}</p>
              <ion-button class="primary-button" expand="block" routerLink="/login">Iniciar sesión</ion-button>
            }
          }
        </section>
      </main>
    </ion-content>
  `,
  styleUrl: './registro-empresa-status.shared.scss',
})
export class RegistroEmpresaActivarComponent implements OnInit {
  readonly branding = TABLEFLOW_DEFAULT_BRANDING;
  readonly phase = signal<ConfirmPhase>('loading');
  readonly error = signal('');

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    void this.finishConfirm();
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

  private async finishConfirm(): Promise<void> {
    try {
      // AuthService.init already recovers PKCE/implicit callback; wait for it.
      await this.auth.whenReady();
      this.phase.set('confirmed');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Error al procesar la confirmación');
      this.phase.set('error');
    }
  }
}
