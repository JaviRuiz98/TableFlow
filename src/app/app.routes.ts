import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth';
import { RegisterEmpresaPlaceholderComponent } from './features/auth/register-empresa/register-empresa.placeholder';
import { WorkspaceComponent } from './features/workspace';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register-empresa', component: RegisterEmpresaPlaceholderComponent },
  { path: '', canActivate: [authGuard], component: WorkspaceComponent },
  { path: '**', redirectTo: '' },
];
