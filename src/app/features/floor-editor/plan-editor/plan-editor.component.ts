/**
 * PlanEditor — floor-editor coordinator (B8 / C1).
 *
 * Owns: Konva Stage/layers/listeners, active editor model, history arrays.
 * Delegates: geometry/, canvas/ math, tools/, history/,
 *   plan-editor-renderer, plan-editor-viewport, plan-editor-drawing,
 *   plan-editor-delete.facade, components/* (toolbar / dialogs / order).
 *
 * Public contracts (Workspace):
 * - @Input plan, mode, hideSurface
 * - @Output pendingChanged
 * - saveDesign(showConfirmation?)
 * - openOperationalTarget(target)
 *
 * Tables delete: `features/tables`. Do not create a second Stage elsewhere.
 */
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import Konva from 'konva';
import { FloorPlanService, ensureUniqueTableNumbers, nextFreeTableNumber } from '../../floor-plans';
import { GeometryService, type Point } from '../geometry';
import {
  VIEWPORT,
  applyStageSizeIfChanged,
  screenToModelPoint,
  stageSizeFromElement,
  teardownStageResources,
} from '../canvas';
import {
  type EditorTool,
  buildTextElement,
  canEditPlanGeometry,
  normalizeTextFontSize,
  planToolTransition,
  shouldUpdateTextFontSize,
  toolLabel as editorToolLabel,
} from '../tools';
import {
  materializeRestoredSnapshot,
  pushEditorHistory,
  redoEditorHistoryIndex,
  undoEditorHistoryIndex,
} from '../history';
import { AuthService } from '../../../core/auth/auth.service';
import { OrderService } from '../../orders';
import { TableDeletionService } from '../../tables';
import type {
  ClubTable,
  FloorPlan,
  FloorPlanElement,
  FloorSnapshot,
} from '../../../core/models/models';
import { EditorToolbarComponent } from '../editor-toolbar/editor-toolbar.component';
import { OrderAttentionDialogComponent } from '../order-attention-dialog/order-attention-dialog.component';
import { PlanEditorDialogsComponent } from '../plan-editor-dialogs/plan-editor-dialogs.component';
import type { PlanEditorHost } from './plan-editor-host';
import { PlanEditorRenderer } from './plan-editor-renderer';
import { PlanEditorViewport } from './plan-editor-viewport';
import { PlanEditorDrawing } from './plan-editor-drawing';
import { PlanEditorDeleteFacade } from './plan-editor-delete.facade';

@Component({
  selector: 'app-plan-editor',
  standalone: true,
  imports: [CommonModule, EditorToolbarComponent, OrderAttentionDialogComponent, PlanEditorDialogsComponent],
  templateUrl: './plan-editor.component.html',
  styleUrl: './plan-editor.component.scss',
})
export class PlanEditorComponent implements OnChanges, OnDestroy, PlanEditorHost {
  // --- Workspace-facing I/O ---
  @Input({ required: true })
  plan!: FloorPlan;
  @Input()
  mode: 'editor' | 'operativo' = 'editor';
  @Input()
  hideSurface = false;
  @Output()
  pendingChanged = new EventEmitter<number>();
  @ViewChild('container', { static: true })
  container!: ElementRef<HTMLDivElement>;

  // --- Konva stage (single owner; visible to helpers via PlanEditorHost) ---
  stage!: Konva.Stage;
  layer!: Konva.Layer;
  draftLayer!: Konva.Layer;
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrame: number | null = null;
  drawing: Point[] = [];
  elements: FloorPlanElement[] = [];
  tables: ClubTable[] = [];
  reserved: ClubTable[] = [];
  selectedTable: ClubTable | null = null;
  selectedReserved: ClubTable | null = null;
  selectedElementId: string | null = null;
  activeEndpoint: 'start' | 'end' | null = null;
  endpointShape: Konva.Circle | null = null;
  history: FloorSnapshot[] = [];
  historyIndex = -1;
  tool: EditorTool = 'select';
  showTextDialog = false;
  showUnlockDialog = false;
  showDeletePasswordDialog = false;
  showServedDeleteWarning = false;
  pendingDeleteTarget: ClubTable | null = null;
  deletePassword = '';
  deleteError = '';
  newText = '';
  private textPosition: Point | null = null;
  selectedOrderTarget: ClubTable | null = null;
  showOrderDialog = false;
  @ViewChild(OrderAttentionDialogComponent)
  private orderAttentionDialog?: OrderAttentionDialogComponent;
  private realtimeChannel: { unsubscribe: () => void } | null = null;
  pendingMap = new Map<string, number>();
  orderCountMap = new Map<string, number>();
  showSaveDialog = false;
  private _panMode = false;

  private readonly viewport: PlanEditorViewport;
  private readonly renderer: PlanEditorRenderer;
  private readonly drawingSession: PlanEditorDrawing;
  private readonly deleteFacade: PlanEditorDeleteFacade;

  /** Mesas + reservados del plano actual (traslados en la misma jornada). */
  get operationalTables(): ClubTable[] {
    return [...this.tables, ...this.reserved];
  }

  get panMode(): boolean {
    return this._panMode;
  }
  set panMode(value: boolean) {
    this._panMode = value;
  }
  get isAdmin(): boolean {
    return this.auth.hasRole('USER', 'ADMIN');
  }
  get canEditGeometry(): boolean {
    return canEditPlanGeometry({
      isAdmin: this.isAdmin,
      mode: this.mode,
      isLocked: !!this.plan?.is_locked,
    });
  }
  get canZoomOut(): boolean {
    return this.viewport.canZoomOut;
  }
  get canZoomIn(): boolean {
    return this.viewport.canZoomIn;
  }
  get toolLabel(): string {
    return editorToolLabel(this.tool);
  }

  constructor(
    private floors: FloorPlanService,
    private geometry: GeometryService,
    private auth: AuthService,
    private orders: OrderService,
    tableDeletion: TableDeletionService,
    public cdr: ChangeDetectorRef,
  ) {
    this.viewport = new PlanEditorViewport(this);
    this.renderer = new PlanEditorRenderer(this);
    this.drawingSession = new PlanEditorDrawing(this, geometry);
    this.deleteFacade = new PlanEditorDeleteFacade(this, tableDeletion);
  }

  // --- Lifecycle: load plan + stage ---
  async ngOnChanges(changes: SimpleChanges) {
    if (changes['plan']?.currentValue) {
      await this.load();
    }
  }
  private async load() {
    this.viewport.initialViewPending = true;
    const snap = await this.floors.load(this.plan.id);
    this.elements = snap.elements;
    this.tables = (snap.tables ?? []).filter((t) => t.type !== 'RESERVED');
    const snapshotReserved = snap.reserved ?? [];
    const legacyReserved = (snap.tables ?? []).filter((t) => t.type === 'RESERVED');
    this.reserved = [
      ...snapshotReserved,
      ...legacyReserved.filter((legacy) => !snapshotReserved.some((r: ClubTable) => r.id === legacy.id)),
    ];
    this.selectedTable = null;
    this.selectedReserved = null;
    this.selectedElementId = null;
    this.selectedOrderTarget = null;
    this.showOrderDialog = false;
    this.activeEndpoint = null;
    this.endpointShape = null;
    this.clearDrawing();
    this.history = [];
    this.historyIndex = -1;
    this.pushHistory();
    await this.refreshPendingMap();
    this.initStage();
    this.realtimeChannel?.unsubscribe();
    this.realtimeChannel = this.orders.subscribe(() => {
      void this.syncRealtimeState();
    }, `plan-editor-orders-${this.plan.id}`);
  }
  private initStage() {
    if (this.stage) {
      this.stage.destroy();
    }
    const el = this.container.nativeElement;
    const { width, height } = stageSizeFromElement(el);
    this.stage = new Konva.Stage({
      container: el,
      width,
      height,
      draggable: false,
    });
    this.layer = new Konva.Layer();
    this.draftLayer = new Konva.Layer();
    this.stage.add(this.layer);
    this.stage.add(this.draftLayer);
    this.observeStageSize(el);
    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();
      this.viewport.zoomAtPointer(
        e.evt as WheelEvent,
        e.evt.deltaY < 0 ? VIEWPORT.wheelZoomStep : -VIEWPORT.wheelZoomStep,
      );
    });
    this.viewport.installTouchNavigation();
    this.render();
    requestAnimationFrame(() => this.viewport.fitInitialView());
  }
  private observeStageSize(el: HTMLDivElement) {
    this.resizeObserver?.disconnect();
    if (this.resizeFrame !== null) {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = null;
    }
    const resizeStage = () => {
      if (!this.stage) return;
      if (this.resizeFrame !== null) cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = null;
        if (!this.stage) return;
        applyStageSizeIfChanged(this.stage, el.clientWidth, el.clientHeight);
      });
    };
    this.resizeObserver = new ResizeObserver(resizeStage);
    this.resizeObserver.observe(el);
    resizeStage();
  }

  requestRender(): void {
    this.render();
  }
  private render() {
    this.renderer.render();
  }

  onSelectTable(t: ClubTable): void {
    this.selectTable(t);
  }
  onSelectReserved(r: ClubTable): void {
    this.selectReserved(r);
  }
  openTextDialog(point: Point): void {
    this.textPosition = point;
    this.newText = '';
    this.showTextDialog = true;
  }

  private selectTable(t: ClubTable) {
    if (this.mode === 'operativo') {
      void this.openOrderDialog(t);
      return;
    }
    this.selectedTable = t;
    this.selectedReserved = null;
    this.selectedElementId = null;
    this.activeEndpoint = null;
    this.render();
  }
  private selectReserved(r: ClubTable) {
    if (this.mode === 'operativo') {
      void this.openOrderDialog(r);
      return;
    }
    this.selectedReserved = r;
    this.selectedTable = null;
    this.selectedElementId = null;
    this.activeEndpoint = null;
    this.render();
  }
  /** Workspace → open operativo order dialog for a table/reserved. */
  async openOperationalTarget(target: ClubTable): Promise<void> {
    await this.openOrderDialog(target);
  }
  private async openOrderDialog(target: ClubTable) {
    if (this.mode !== 'operativo') {
      return;
    }
    if (target.type === 'RESERVED') {
      this.selectedReserved = target;
      this.selectedTable = null;
    } else {
      this.selectedTable = target;
      this.selectedReserved = null;
    }
    this.selectedElementId = null;
    this.selectedOrderTarget = target;
    this.showOrderDialog = true;
    this.render();
  }

  onOrderDialogClosed(): void {
    this.showOrderDialog = false;
    this.selectedOrderTarget = null;
  }
  onOrderDialogPendingChanged(): void {
    void this.refreshPendingMap();
  }
  onOrderCanvasRefresh(): void {
    this.render();
  }
  onOrderTargetPatched(): void {
    this.render();
  }

  async onTransferCompleted(_event: { sourceId: string; targetId: string }): Promise<void> {
    if (!this.plan?.id) return;
    try {
      await this.load();
    } catch (error) {
      console.error('Error recargando plano tras traslado:', error);
      this.render();
    }
  }

  async togglePlanLock(): Promise<void> {
    if (!this.isAdmin) return;
    if (this.plan.is_locked) {
      this.showUnlockDialog = true;
      return;
    }
    try {
      await this.floors.setLocked(this.plan.id, true);
      this.plan.is_locked = true;
      this.setTool('pan');
      this.render();
    } catch (error) {
      console.error('No se pudo fijar el plano:', error);
    }
  }
  closeUnlockDialog(): void {
    this.showUnlockDialog = false;
  }
  async confirmUnlock(): Promise<void> {
    if (!this.isAdmin) return;
    try {
      await this.floors.setLocked(this.plan.id, false);
      this.plan.is_locked = false;
      this.showUnlockDialog = false;
      this.setTool('select');
      this.render();
    } catch (error) {
      console.error('No se pudo desbloquear el plano:', error);
    }
  }

  deleteSelected(): void {
    this.deleteFacade.deleteSelected();
  }
  closeDeletePasswordDialog(): void {
    this.deleteFacade.closeDeletePasswordDialog();
  }
  async confirmProtectedDelete(): Promise<void> {
    await this.deleteFacade.confirmProtectedDelete();
  }
  cancelServedDelete(): void {
    this.deleteFacade.cancelServedDelete();
  }
  async confirmServedDelete(): Promise<void> {
    await this.deleteFacade.confirmServedDelete();
  }

  private async syncRealtimeState(): Promise<void> {
    await Promise.all([this.refreshTableAttentionStates(), this.refreshPendingMap()]);
    await this.orderAttentionDialog?.reloadIfOpen();
    this.render();
  }
  private async refreshTableAttentionStates(): Promise<void> {
    try {
      const states = await this.floors.loadTableAttentionStates(this.plan.id);
      const byId = new Map(states.map((state) => [state.id, state]));
      const apply = (table: ClubTable) => {
        const state = byId.get(table.id);
        if (!state) return;
        table.attended = state.attended;
        table.observation = state.observation ?? null;
        table.reserved = state.reserved;
        table.updated_at = state.updated_at;
      };
      this.tables.forEach(apply);
      this.reserved.forEach(apply);
    } catch (error) {
      console.error('Error sincronizando el estado visual de mesas/reservados:', error);
    }
  }
  private async refreshPendingMap() {
    try {
      const { pendingByTableId, totalByTableId } = await this.orders.getOpenOrderQuantityMaps();
      this.pendingMap = pendingByTableId;
      this.orderCountMap = totalByTableId;
      this.pendingChanged.emit([...pendingByTableId.values()].reduce((a, b) => a + b, 0));
      this.render();
    } catch {
      // Silenciado a propósito: realtime reintentará.
    }
  }
  ngOnDestroy() {
    this.showOrderDialog = false;
    this.selectedOrderTarget = null;
    this.realtimeChannel?.unsubscribe();
    this.realtimeChannel = null;
    teardownStageResources({
      stage: this.stage,
      resizeObserver: this.resizeObserver,
      resizeFrame: this.resizeFrame,
    });
    this.resizeObserver = null;
    this.resizeFrame = null;
  }

  setTool(tool: EditorTool) {
    const transition = planToolTransition(tool, this.canEditGeometry);
    if (!transition.applied) return;
    this.tool = transition.tool;
    this.panMode = transition.panMode;
    this.activeEndpoint = null;
    if (this.stage) {
      this.stage.draggable(this.panMode);
    }
    if (transition.clearSelection) {
      this.selectedElementId = null;
      this.selectedTable = null;
      this.selectedReserved = null;
    }
    if (transition.clearDrawing) {
      this.clearDrawing();
    }
    this.render();
  }
  pointerDown(ev: PointerEvent) {
    this.drawingSession.pointerDown(ev);
  }
  pointerMove(ev: PointerEvent) {
    this.drawingSession.pointerMove(ev);
  }
  pointerUp(ev: PointerEvent) {
    this.drawingSession.pointerUp(ev);
  }
  clearDrawing() {
    this.drawingSession.clearDrawing();
  }
  get selectedTextElement(): FloorPlanElement | null {
    if (!this.selectedElementId) return null;
    const element = this.elements.find((item) => item.id === this.selectedElementId) ?? null;
    return element?.kind === 'text' ? element : null;
  }
  get selectedTextFontSize(): number {
    return this.selectedTextElement?.font_size ?? 22;
  }
  setSelectedTextFontSize(value: string | number | null | undefined) {
    const element = this.selectedTextElement;
    if (!element || !this.canEditGeometry) return;
    const next = normalizeTextFontSize(value);
    if (next === null) return;
    if (!shouldUpdateTextFontSize(element.font_size, next)) return;
    element.font_size = next;
    element.updated_at = new Date().toISOString();
    this.pushHistory();
    this.render();
  }
  closeTextDialog() {
    this.showTextDialog = false;
    this.newText = '';
    this.textPosition = null;
  }
  confirmAddText() {
    const text = this.newText.trim();
    if (!text || !this.textPosition) {
      return;
    }
    const now = new Date().toISOString();
    const textElement = buildTextElement({
      planId: this.plan.id,
      position: this.textPosition,
      label: text,
      zIndex: this.elements.length,
      now,
    });
    this.elements = [...this.elements, textElement];
    this.selectedElementId = textElement.id;
    this.selectedTable = null;
    this.selectedReserved = null;
    this.pushHistory();
    this.render();
    this.closeTextDialog();
    this.setTool('select');
  }

  /** Workspace → persist current snapshot via FloorPlanService (ADMIN). */
  async saveDesign(showConfirmation = true): Promise<boolean> {
    if (!this.isAdmin) return false;
    try {
      if (this.drawing.length >= 2) {
        this.drawingSession.convertDrawing();
      }
      // DB unique (floor_plan_id, number) spans TABLE + RESERVED — heal collisions before RPC.
      const unique = ensureUniqueTableNumbers({
        elements: this.elements,
        tables: this.tables,
        reserved: this.reserved,
      });
      this.tables = unique.tables;
      this.reserved = unique.reserved ?? [];
      await this.floors.saveSnapshot(this.plan.id, {
        elements: this.elements,
        tables: this.tables,
        reserved: this.reserved,
      });
      this.render();
      if (showConfirmation) this.showSaveDialog = true;
      return true;
    } catch (e) {
      console.error('Error guardando diseño:', e);
      return false;
    }
  }
  closeSaveDialog() {
    this.showSaveDialog = false;
  }
  addTable() {
    if (!this.canEditGeometry) return;
    const n = nextFreeTableNumber([
      ...this.tables.map((t) => t.number),
      ...this.reserved.map((r) => r.number),
    ]);
    const now = new Date().toISOString();
    const table: ClubTable = {
      id: crypto.randomUUID(),
      floor_plan_id: this.plan.id,
      number: n,
      type: 'TABLE',
      x: 300 + this.tables.length * 20,
      y: 300 + this.tables.length * 20,
      width: 100,
      height: 80,
      rotation: 0,
      shape: 'circle',
      created_at: now,
      updated_at: now,
      attended: false,
      observation: null,
      reserved: false,
    };
    this.tables = [...this.tables, table];
    this.selectedTable = table;
    this.selectedReserved = null;
    this.selectedElementId = null;
    this.pushHistory();
    this.render();
  }
  addReserved() {
    if (!this.canEditGeometry) return;
    const n = nextFreeTableNumber([
      ...this.tables.map((t) => t.number),
      ...this.reserved.map((r) => r.number),
    ]);
    const now = new Date().toISOString();
    const reserved: ClubTable = {
      id: crypto.randomUUID(),
      floor_plan_id: this.plan.id,
      type: 'RESERVED',
      attended: false,
      observation: null,
      reserved: false,
      number: n,
      x: 300 + this.reserved.length * 20,
      y: 450 + this.reserved.length * 20,
      width: 140,
      height: 80,
      rotation: 0,
      shape: 'rectangle',
      created_at: now,
      updated_at: now,
    };
    this.reserved = [...this.reserved, reserved];
    this.selectedReserved = reserved;
    this.selectedTable = null;
    this.selectedElementId = null;
    this.pushHistory();
    this.render();
  }
  togglePan() {
    this.setTool(this.tool === 'pan' ? 'select' : 'pan');
  }
  zoom(delta: number) {
    this.viewport.zoom(delta);
  }

  pushHistory() {
    const next = pushEditorHistory(
      { entries: this.history, index: this.historyIndex },
      { elements: this.elements, tables: this.tables, reserved: this.reserved },
    );
    this.history = next.entries;
    this.historyIndex = next.index;
  }
  restore(s: FloorSnapshot) {
    const content = materializeRestoredSnapshot(s);
    this.elements = content.elements;
    this.tables = content.tables;
    this.reserved = content.reserved;
    this.selectedElementId = null;
    this.selectedTable = null;
    this.selectedReserved = null;
    this.selectedOrderTarget = null;
    this.showOrderDialog = false;
    this.activeEndpoint = null;
    this.render();
  }
  undo() {
    const nextIndex = undoEditorHistoryIndex(this.historyIndex);
    if (nextIndex === null) {
      return;
    }
    this.historyIndex = nextIndex;
    this.restore(this.history[this.historyIndex]);
  }
  redo() {
    const nextIndex = redoEditorHistoryIndex(this.historyIndex, this.history.length);
    if (nextIndex === null) {
      return;
    }
    this.historyIndex = nextIndex;
    this.restore(this.history[this.historyIndex]);
  }
  getStagePointerPoint(event: Event): Point | null {
    if (!this.stage) {
      return null;
    }
    this.stage.setPointersPositions(event);
    const pointer = this.stage.getPointerPosition();
    if (!pointer) {
      return null;
    }
    return screenToModelPoint(pointer, this.stage.x(), this.stage.y(), this.stage.scaleX() || 1);
  }
  getCanvasPoint(ev: PointerEvent): Point | null {
    return this.getStagePointerPoint(ev);
  }
}
