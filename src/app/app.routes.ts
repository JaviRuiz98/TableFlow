import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth';
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
  { path: 'register-empresa', redirectTo: 'registro-empresa', pathMatch: 'full' },
  { path: '', canActivate: [authGuard], component: WorkspaceComponent },
  { path: '**', redirectTo: '' },
];
