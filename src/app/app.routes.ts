import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth';
import { onboardingAdminGuard } from './features/onboarding/onboarding.guard';
import { onboardingPreviewGuard } from './features/onboarding/onboarding-preview.guard';
import { workspaceEntryGuard } from './features/onboarding/workspace-entry.guard';
import { WorkspaceComponent } from './features/workspace';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'registro-empresa',
    loadComponent: () =>
      import('./features/auth/registro-empresa/registro-empresa.component').then(
        (m) => m.RegistroEmpresaComponent,
      ),
  },
  {
    path: 'registro-empresa/pendiente',
    loadComponent: () =>
      import('./features/auth/registro-empresa/registro-empresa-pendiente.component').then(
        (m) => m.RegistroEmpresaPendienteComponent,
      ),
  },
  {
    path: 'registro-empresa/activar',
    loadComponent: () =>
      import('./features/auth/registro-empresa/registro-empresa-activar.component').then(
        (m) => m.RegistroEmpresaActivarComponent,
      ),
  },
  { path: 'register-empresa', redirectTo: 'registro-empresa', pathMatch: 'full' },
  {
    path: 'onboarding',
    canActivate: [authGuard, onboardingAdminGuard],
    loadComponent: () =>
      import('./features/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
  },
  {
    path: 'onboarding-preview',
    canActivate: [onboardingPreviewGuard],
    loadComponent: () =>
      import('./features/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
  },
  {
    path: '',
    canActivate: [authGuard, workspaceEntryGuard],
    component: WorkspaceComponent,
  },
  { path: '**', redirectTo: '' },
];
