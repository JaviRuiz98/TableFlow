import { Component, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personAddOutline, refreshOutline } from 'ionicons/icons';
import { AdminMetricsService, type AdminStaffRow } from '../admin-metrics.service';
import { WorkspaceUserAdminComponent } from '../../workspace/workspace-user-admin/workspace-user-admin.component';

@Component({
  selector: 'app-admin-staff',
  standalone: true,
  imports: [CommonModule, IonIcon, WorkspaceUserAdminComponent],
  templateUrl: './admin-staff.component.html',
  styleUrl: './admin-staff.component.scss',
})
export class AdminStaffComponent implements OnInit {
  @ViewChild('userAdmin') private userAdmin?: WorkspaceUserAdminComponent;

  readonly loading = signal(true);
  readonly rows = signal<AdminStaffRow[]>([]);
  readonly detail = signal('');
  readonly toast = signal('');

  constructor(private readonly metrics: AdminMetricsService) {
    addIcons({ personAddOutline, refreshOutline });
  }

  ngOnInit(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const snap = await this.metrics.loadOverview();
      if (snap.staff.availability === 'ready' && snap.staff.value) {
        this.rows.set(snap.staff.value);
        this.detail.set('');
      } else {
        this.rows.set([]);
        this.detail.set(snap.staff.detail ?? 'Sin personal.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    this.userAdmin?.openAccess();
  }

  onToast(message: string): void {
    this.toast.set(message);
  }

  onCreated(): void {
    void this.refresh();
  }

  roleLabel(role: string): string {
    if (role === 'ADMIN') return 'Administrador';
    if (role === 'USER') return 'Usuario';
    if (role === 'RECEPTOR') return 'Receptor';
    return role;
  }
}
