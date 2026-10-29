import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { IonSpinner } from '@ionic/angular/standalone';

import { FloorPlanService } from '../../floor-plans';
import { OrderService } from '../../orders';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ClubTable, FloorPlan, OrderItemWithProduct } from '../../../core/models/models';

type AssignmentTarget = ClubTable & { displayName: string; kindLabel: string };
type ListedItem = OrderItemWithProduct;
type ListedTarget = AssignmentTarget & { items: ListedItem[] };

@Component({
  selector: 'app-table-product-panel',
  standalone: true,
  imports: [CommonModule, IonSpinner],
  templateUrl: './table-product-panel.component.html',
  styleUrl: './table-product-panel.component.scss',
})
export class TableProductPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) plan!: FloorPlan;
  @Output() targetSelected = new EventEmitter<ClubTable>();

  listedTargets: ListedTarget[] = [];
  loading = false;
  errorMessage = '';
  private realtimeChannel: RealtimeChannel | null = null;
  private loadVersion = 0;

  constructor(
    private readonly floors: FloorPlanService,
    private readonly orders: OrderService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  get pendingTargets(): ListedTarget[] {
    return this.listedTargets
      .filter((target) => !target.attended && (this.currentItems(target).length > 0 || this.hasObservation(target)))
      .sort((a, b) => (a.type === b.type ? a.number - b.number : a.type === 'TABLE' ? -1 : 1));
  }

  hasObservation(target: ListedTarget): boolean {
    return Boolean((target.observation ?? '').trim());
  }

  get attendedTables(): ListedTarget[] {
    return this.listedTargets
      .filter((target) => target.type === 'TABLE' && !this.pendingTargets.some((pending) => pending.id === target.id))
      .sort((a, b) => a.number - b.number);
  }

  get attendedReserved(): ListedTarget[] {
    return this.listedTargets
      .filter((target) => target.type === 'RESERVED' && !this.pendingTargets.some((pending) => pending.id === target.id))
      .sort((a, b) => a.number - b.number);
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['plan']?.currentValue?.id) {
      await this.load();
      this.subscribeRealtime();
    }
  }

  ngOnDestroy(): void {
    this.realtimeChannel?.unsubscribe?.();
  }

  async load(): Promise<void> {
    const version = ++this.loadVersion;
    this.loading = true;
    try {
      const snapshot = await this.floors.load(this.plan.id);
      if (version !== this.loadVersion) return;

      const targets = [...(snapshot.tables ?? []), ...(snapshot.reserved ?? [])].sort((a, b) =>
        a.type === b.type ? a.number - b.number : a.type === 'TABLE' ? -1 : 1,
      );

      const orderResults = await Promise.all(targets.map((table) => this.orders.forTable(table.id)));
      if (version !== this.loadVersion) return;

      this.listedTargets = targets.map((table, index) => ({
        ...table,
        displayName: `${table.type === 'RESERVED' ? 'Reservado' : 'Mesa'} ${table.number}`,
        kindLabel: table.type === 'RESERVED' ? 'RESERVADO' : 'MESA',
        items: orderResults[index]?.items ?? [],
      }));
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'No se pudo cargar la operativa';
    } finally {
      if (version === this.loadVersion) {
        this.loading = false;
        this.cdr.detectChanges();
      }
    }
  }

  selectTarget(target: ListedTarget): void {
    this.targetSelected.emit(target);
  }

  currentItems(target: ListedTarget): ListedItem[] {
    return target.items.filter((item) => item.status === 'PENDING' && item.attended !== true);
  }

  attendedItems(target: ListedTarget): ListedItem[] {
    return target.items.filter((item) => item.status === 'PLACED' || item.attended === true);
  }

  private subscribeRealtime(): void {
    this.realtimeChannel?.unsubscribe?.();
    this.realtimeChannel = this.orders.subscribe(() => void this.load(), `table-product-panel-${this.plan.id}`);
  }
}
