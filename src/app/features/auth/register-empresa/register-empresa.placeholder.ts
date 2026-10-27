import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import { TABLEFLOW_DEFAULT_BRANDING } from '../../../core/branding';

/**
 * Temporary public entry for company registration CTA from login.
 * Replace with the real onboarding flow when multi-company registration ships.
 */
@Component({
  selector: 'app-register-empresa-placeholder',
  standalone: true,
  imports: [RouterLink, IonContent, IonButton],
  template: `
    <ion-content [fullscreen]="true" class="register-page">
      <main class="register-shell">
        <section class="register-card">
          <p class="eyebrow">{{ branding.productName }}</p>
          <h1>Registro de empresa</h1>
          <p class="copy">
            El alta de nuevas empresas estará disponible en una próxima fase. Mientras tanto, vuelve al acceso
            para personal autorizado.
          </p>
          <ion-button class="back-button" expand="block" fill="outline" routerLink="/login">
            Volver al acceso
          </ion-button>
        </section>
      </main>
    </ion-content>
  `,
  styles: [
    `
      .register-page {
        --background: #0b0b0f;
      }
      .register-shell {
        box-sizing: border-box;
        min-height: 100%;
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: max(28px, env(safe-area-inset-top, 0px)) 20px max(28px, env(safe-area-inset-bottom, 0px));
        background:
          radial-gradient(ellipse 50% 40% at 50% 20%, rgba(212, 175, 124, 0.08), transparent 70%),
          #0b0b0f;
        color: #f4efe6;
      }
      .register-card {
        width: min(440px, 100%);
        padding: 36px 28px;
        border-radius: 18px;
        border: 1px solid rgba(212, 175, 124, 0.18);
        background: rgba(18, 18, 24, 0.85);
        text-align: center;
      }
      .eyebrow {
        margin: 0 0 10px;
        color: #d4af7c;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 28px;
        font-weight: 600;
        letter-spacing: -0.02em;
      }
      .copy {
        margin: 0 0 28px;
        color: #9a948a;
        font-size: 15px;
        line-height: 1.5;
      }
      .back-button {
        --border-color: rgba(212, 175, 124, 0.45);
        --color: #d4af7c;
        --border-radius: 12px;
        --background: transparent;
        min-height: 48px;
        font-weight: 650;
        text-transform: none;
      }
    `,
  ],
})
export class RegisterEmpresaPlaceholderComponent {
  readonly branding = TABLEFLOW_DEFAULT_BRANDING;
}
