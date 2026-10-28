import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { analyticsOutline } from 'ionicons/icons';
import {
  AdminMetricsService,
  type AdminOverviewSnapshot,
  type MetricsScopeKind,
} from '../admin-metrics.service';

@Component({
  selector: 'app-admin-activity',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './admin-activity.component.html',
  styleUrl: './admin-activity.component.scss',
})
export class AdminActivityComponent implements OnInit {
  readonly loading = signal(true);
  readonly snapshot = signal<AdminOverviewSnapshot | null>(null);
  readonly scopeKind = signal<MetricsScopeKind>('last7');

  constructor(private readonly metrics: AdminMetricsService) {
    addIcons({ analyticsOutline });
  }

  ngOnInit(): void {
    void this.refresh();
  }

  async onScopeChange(kind: MetricsScopeKind): Promise<void> {
    this.scopeKind.set(kind);
    await this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      this.snapshot.set(await this.metrics.loadOverview({ kind: this.scopeKind() }));
    } finally {
      this.loading.set(false);
    }
  }

  displayValue(value: number | null | undefined): string {
    return value == null ? '—' : String(value);
  }
}
