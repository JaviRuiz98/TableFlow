import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  restaurantOutline,
  mapOutline,
  arrowForwardOutline,
  timeOutline,
  calendarOutline,
  bookmarkOutline,
  peopleCircleOutline,
  checkmarkDoneOutline,
  checkmarkCircleOutline,
  addCircleOutline,
  constructOutline,
  alertCircleOutline,
  clipboardOutline,
  cashOutline,
  ellipseOutline,
} from 'ionicons/icons';
import {
  AdminMetricsService,
  type AdminMetric,
  type AdminOverviewSnapshot,
  type FacturacionPoint,
  type JornadaSummary,
  type AperturasBreakdown,
  type MetricsScope,
  type MetricsScopeKind,
  type RatioMetric,
} from '../admin-metrics.service';
import { AdminCompanyContextService } from '../admin-company-context.service';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonIcon],
  templateUrl: './admin-overview.component.html',
  styleUrl: './admin-overview.component.scss',
})
export class AdminOverviewComponent implements OnInit {
  /** First paint only — later refreshes keep content visible. */
  readonly initialLoading = signal(true);
  readonly refreshing = signal(false);
  readonly snapshot = signal<AdminOverviewSnapshot | null>(null);
  readonly companyName = this.companyCtx.companyName;

  readonly scopeKind = signal<MetricsScopeKind>('jornada');
  readonly selectedJornadaId = signal<string | null>(null);
  readonly customFrom = signal('');
  readonly customTo = signal('');
  readonly datePickerOpen = signal(false);

  readonly jornadas = computed(() => this.snapshot()?.jornadas.value ?? []);

  /** 0=jornada, 1=last7, 2=last30; -1 when exact date (calendar). */
  readonly segmentIndex = computed(() => {
    const kind = this.scopeKind();
    if (kind === 'jornada') return 0;
    if (kind === 'last7') return 1;
    if (kind === 'last30') return 2;
    return -1;
  });

  readonly metricsAnimKey = computed(() => {
    const snap = this.snapshot();
    if (!snap) return 'empty';
    if (snap.mode === 'jornada') {
      return `j:${snap.selectedJornada?.id ?? 'none'}`;
    }
    return `p:${snap.scope.kind}:${snap.scope.from ?? ''}:${snap.scope.to ?? ''}`;
  });

  constructor(
    private readonly metrics: AdminMetricsService,
    private readonly companyCtx: AdminCompanyContextService,
  ) {
    addIcons({
      peopleOutline,
      restaurantOutline,
      mapOutline,
      arrowForwardOutline,
      timeOutline,
      calendarOutline,
      bookmarkOutline,
      peopleCircleOutline,
      checkmarkDoneOutline,
      checkmarkCircleOutline,
      addCircleOutline,
      constructOutline,
      alertCircleOutline,
      clipboardOutline,
      cashOutline,
      ellipseOutline,
    });
  }

  ngOnInit(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const soft = this.snapshot() !== null;
    if (soft) {
      this.refreshing.set(true);
    } else {
      this.initialLoading.set(true);
    }
    try {
      const snap = await this.metrics.loadOverview(this.buildScope());
      this.snapshot.set(snap);
      if (snap.scope.kind === 'jornada' && snap.selectedJornada) {
        this.selectedJornadaId.set(snap.selectedJornada.id);
      }
      if (snap.scope.kind === 'custom') {
        if (snap.scope.from) this.customFrom.set(snap.scope.from);
        if (snap.scope.to) this.customTo.set(snap.scope.to);
      }
    } finally {
      this.initialLoading.set(false);
      this.refreshing.set(false);
    }
  }

  onScopeKindChange(kind: MetricsScopeKind): void {
    if (kind === this.scopeKind() && !this.refreshing()) return;
    this.scopeKind.set(kind);
    if (kind !== 'custom') {
      this.datePickerOpen.set(false);
    }
    if (kind === 'custom') {
      const today = this.isoToday();
      if (!this.customFrom()) this.customFrom.set(today);
      if (!this.customTo()) this.customTo.set(today);
    }
    void this.refresh();
  }

  toggleDatePicker(): void {
    if (this.scopeKind() === 'custom' && this.datePickerOpen()) {
      this.datePickerOpen.set(false);
      return;
    }
    const today = this.isoToday();
    if (!this.customFrom()) this.customFrom.set(today);
    if (!this.customTo()) this.customTo.set(this.customFrom() || today);
    this.datePickerOpen.set(true);
    this.scopeKind.set('custom');
    void this.refresh();
  }

  onJornadaChange(id: string): void {
    this.selectedJornadaId.set(id || null);
    this.scopeKind.set('jornada');
    this.datePickerOpen.set(false);
    void this.refresh();
  }

  onCustomRangeApply(): void {
    this.scopeKind.set('custom');
    this.datePickerOpen.set(true);
    void this.refresh();
  }

  displayValue(metric: AdminMetric | undefined): string {
    if (!metric) return '—';
    if (metric.availability === 'error' || metric.availability === 'unavailable') return '—';
    if (metric.value == null) return '—';
    return String(metric.value);
  }

  displayRatio(metric: AdminMetric<RatioMetric> | undefined): string {
    if (!metric) return '—';
    if (metric.availability === 'error' || metric.availability === 'unavailable') return '—';
    if (!metric.value) return '—';
    return `${metric.value.numerator} / ${metric.value.denominator}`;
  }

  formatMoney(amount: number | null | undefined): string {
    const value = Number(amount) || 0;
    try {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${value.toFixed(0)} €`;
    }
  }

  displayMoney(metric: AdminMetric | undefined): string {
    if (!metric) return '—';
    if (metric.availability === 'error' || metric.availability === 'unavailable') return '—';
    if (metric.value == null) return '—';
    return this.formatMoney(Number(metric.value));
  }

  chartMax(points: FacturacionPoint[] | null | undefined): number {
    if (!points?.length) return 0;
    return points.reduce((max, p) => Math.max(max, p.amount), 0);
  }

  chartBars(points: FacturacionPoint[] | null | undefined): Array<{
    date: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }> {
    if (!points?.length) return [];
    const max = Math.max(this.chartMax(points), 1);
    const n = points.length;
    const padX = 8;
    const chartW = 640 - padX * 2;
    const chartH = 180;
    const gap = n > 20 ? 1.5 : n > 10 ? 3 : 6;
    const barW = Math.max(2, (chartW - gap * (n - 1)) / n);
    return points.map((p, i) => {
      const height = Math.max(p.amount > 0 ? 4 : 0, (p.amount / max) * chartH);
      return {
        date: p.date,
        x: padX + i * (barW + gap),
        y: 200 - height,
        width: barW,
        height,
      };
    });
  }

  chartLabelTicks(
    points: FacturacionPoint[] | null | undefined,
  ): Array<{ date: string; label: string }> {
    if (!points?.length) return [];
    const maxLabels = points.length <= 7 ? points.length : 6;
    const step = Math.max(1, Math.ceil(points.length / maxLabels));
    return points
      .filter((_, i) => i % step === 0 || i === points.length - 1)
      .map((p) => ({
        date: p.date,
        label: p.date.slice(8),
      }));
  }

  aperturasTotal(metric: AdminMetric<AperturasBreakdown> | undefined): string {
    if (!metric) return '—';
    if (metric.availability === 'error' || metric.availability === 'unavailable') return '—';
    if (!metric.value) return '—';
    return String(metric.value.total);
  }

  statusLabel(metric: AdminMetric<unknown> | undefined): string {
    if (!metric) return '';
    if (metric.availability === 'unavailable') return 'No disponible';
    if (metric.availability === 'error') return 'Error';
    if (metric.availability === 'ready') return 'Actualizado';
    if (metric.availability === 'empty') return '';
    return '';
  }

  jornadaStatusLabel(status: string): string {
    if (status === 'open') return 'Abierta';
    if (status === 'scheduled') return 'Programada';
    if (status === 'closed') return 'Cerrada';
    return status;
  }

  formatJornadaHeadline(j: JornadaSummary): string {
    return `${this.formatLongDate(j.opening_date)} · ${j.name}`;
  }

  formatJornadaOption(j: JornadaSummary): string {
    return `${this.formatLongDate(j.opening_date)} · ${j.name} (${this.jornadaStatusLabel(j.status)})`;
  }

  formatCustomRangeHeadline(): string {
    const from = this.customFrom();
    const to = this.customTo();
    if (from && to && from === to) {
      return this.formatLongDate(from);
    }
    if (from && to) {
      return `${this.formatLongDate(from)} – ${this.formatLongDate(to)}`;
    }
    return 'Rango personalizado';
  }

  formatLongDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    try {
      const formatted = new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date(y, m - 1, d));
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return `${d}/${m}/${y}`;
    }
  }

  formatTime(t: string): string {
    return (t || '').slice(0, 5);
  }

  formatDateTime(iso: string): string {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  orderStatusLabel(status: string): string {
    if (status === 'OPEN') return 'Pendiente';
    if (status === 'CLOSED') return 'Atendido';
    if (status === 'CANCELLED') return 'Cancelado';
    return status;
  }

  private buildScope(): MetricsScope {
    const kind = this.scopeKind();
    if (kind === 'jornada') {
      return { kind: 'jornada', jornadaId: this.selectedJornadaId() };
    }
    if (kind === 'custom') {
      return { kind: 'custom', from: this.customFrom(), to: this.customTo() };
    }
    return { kind };
  }

  private isoToday(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
