import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  cubeOutline,
  restaurantOutline,
  gridOutline,
  mapOutline,
  arrowForwardOutline,
  timeOutline,
} from 'ionicons/icons';
import {
  AdminMetricsService,
  type AdminMetric,
  type AdminOverviewSnapshot,
} from '../admin-metrics.service';
import { AdminCompanyContextService } from '../admin-company-context.service';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, IonIcon],
  templateUrl: './admin-overview.component.html',
  styleUrl: './admin-overview.component.scss',
})
export class AdminOverviewComponent implements OnInit {
  readonly loading = signal(true);
  readonly snapshot = signal<AdminOverviewSnapshot | null>(null);
  readonly companyName = this.companyCtx.companyName;

  constructor(
    private readonly metrics: AdminMetricsService,
    private readonly companyCtx: AdminCompanyContextService,
  ) {
    addIcons({
      peopleOutline,
      cubeOutline,
      restaurantOutline,
      gridOutline,
      mapOutline,
      arrowForwardOutline,
      timeOutline,
    });
  }

  ngOnInit(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      this.snapshot.set(await this.metrics.loadOverview());
    } finally {
      this.loading.set(false);
    }
  }

  displayValue(metric: AdminMetric | undefined): string {
    if (!metric) return '—';
    if (metric.availability === 'error' || metric.availability === 'unavailable') return '—';
    if (metric.value == null) return '—';
    return String(metric.value);
  }

  statusLabel(metric: AdminMetric | undefined): string {
    if (!metric) return '';
    if (metric.availability === 'unavailable') return 'No disponible';
    if (metric.availability === 'error') return 'Error';
    if (metric.availability === 'ready') return 'Actualizado';
    return '';
  }
}
