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
  /** Hovered day in the period billing chart (tooltip). */
  readonly hoveredBillingDate = signal<string | null>(null);

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
      this.hoveredBillingDate.set(null);
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
    amount: number;
    pct: number;
    dayLabel: string;
    showLabel: boolean;
  }> {
    if (!points?.length) return [];
    const max = Math.max(this.chartMax(points), 1);
    const maxLabels = points.length <= 7 ? points.length : points.length <= 14 ? 7 : 8;
    const step = Math.max(1, Math.round((points.length - 1) / Math.max(maxLabels - 1, 1)));
    const labelIndexes = new Set<number>();
    for (let i = 0; i < points.length; i += step) {
      labelIndexes.add(i);
    }
    labelIndexes.add(points.length - 1);

    return points.map((p, i) => ({
      date: p.date,
      amount: p.amount,
      pct: Math.max(p.amount > 0 ? 3 : 0, (p.amount / max) * 100),
      dayLabel: p.date.slice(8),
      showLabel: labelIndexes.has(i),
    }));
  }

  onBillingBarEnter(date: string): void {
    this.hoveredBillingDate.set(date);
  }

  onBillingBarLeave(): void {
    this.hoveredBillingDate.set(null);
  }

  formatChartDay(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    if (!y || !m || !d) return date;
    try {
      return new Intl.DateTimeFormat('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(new Date(y, m - 1, d));
    } catch {
      return date;
    }
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

  activityStatusLabel(status: string): string {
    if (status === 'PENDIENTE') return 'Pendiente';
    if (status === 'ATENDIDO') return 'Atendido';
    if (status === 'RESERVADA') return 'Reservada';
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
