import { Routes } from '@angular/router';
import { adminDashboardGuard } from './admin-dashboard.guard';
import { AdminShellComponent } from './admin-shell/admin-shell.component';

export const ADMIN_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    canActivate: [adminDashboardGuard],
    component: AdminShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'resumen' },
      {
        path: 'resumen',
        loadComponent: () =>
          import('./admin-overview/admin-overview.component').then((m) => m.AdminOverviewComponent),
      },
      {
        path: 'actividad',
        loadComponent: () =>
          import('./admin-activity/admin-activity.component').then((m) => m.AdminActivityComponent),
      },
      {
        path: 'sala',
        loadComponent: () =>
          import('./admin-sala/admin-sala.component').then((m) => m.AdminSalaComponent),
      },
      {
        path: 'personal',
        loadComponent: () =>
          import('./admin-staff/admin-staff.component').then((m) => m.AdminStaffComponent),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./admin-settings/admin-settings.component').then((m) => m.AdminSettingsComponent),
      },
    ],
  },
];
