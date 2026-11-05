/**
 * Konva scene painter for PlanEditor.
 * PlanEditor remains sole Stage owner; this class only paints into a Layer
 * and mutates model/selection through the host.
 */
import Konva from 'konva';
import { getLineEndpoints, moveLine, updateLineEndpoint } from '../geometry';
import { elementsDraggable, isZoneShapeKind, ZONE_SHAPE_ELLIPSE } from '../tools';
import type { ClubTable, FloorPlanElement } from '../../../core/models/models';
import type { PlanEditorHost } from './plan-editor-host';

export class PlanEditorRenderer {
  constructor(private readonly host: PlanEditorHost) {}

  render(): void {
    const h = this.host;
    if (!h.layer) {
      return;
    }
    h.layer.destroyChildren();
    h.activeEndpoint = null;
    h.endpointShape = null;
    for (const e of h.elements) {
      if (String(e.kind) === 'text') {
        this.renderTextElement(e);
        continue;
      }
      if (String(e.kind) === 'zone' && isZoneShapeKind(e.label)) {
        this.renderZoneShape(e);
        continue;
      }
      this.renderLineElement(e);
    }
    for (const t of h.tables) {
      this.renderTable(t);
    }
    for (const r of h.reserved) {
      this.renderReserved(r);
    }
    h.layer.draw();
  }

  /** Idle fill for RESERVED blocks — distinct from mesa «reservada» gold. */
  static readonly RESERVED_BLOCK_COLOR = '#3b2a4a';
  /** Status fill when reserved=true (mesa or reservado). */
  static readonly RESERVED_STATUS_COLOR = '#c4a574';

  /**
   * Colores de mesa/reservado en modo operativo (alineados con el panel):
   *  - Pedido pendiente / observación -> rojo
   *  - Mesa atendida (botella puesta) -> verde
   *  - Flag reserved=true             -> dorado champagne
   *  - Resto                          -> normal (mesa negra / bloque morado)
   */
  tableColor(t: ClubTable, _hasProducts: boolean, normalColor = '#111111'): string {
    const pendingQty = this.host.pendingMap?.get(t.id) ?? 0;
    const needsAttention =
      !t.attended && (pendingQty > 0 || Boolean((t.observation ?? '').trim()));
    if (needsAttention) {
      return '#9f2f3a';
    }
    if (t.attended) {
      return '#4c8b62';
    }
    if (t.reserved) {
      return PlanEditorRenderer.RESERVED_STATUS_COLOR;
    }
    return normalColor;
  }

  private renderTextElement(e: FloorPlanElement): void {
    const h = this.host;
    const selected = h.selectedElementId === e.id;
    const text = new Konva.Text({
      x: e.x,
      y: e.y,
      text: e.label ?? '',
      fill: selected ? '#6b4430' : '#2d211b',
      fontSize: e.font_size ?? 22,
      fontStyle: 'bold',
      padding: 6,
      rotation: e.rotation ?? 0,
      draggable: elementsDraggable(h.canEditGeometry, h.tool),
      name: e.id,
      shadowColor: 'rgba(0,0,0,.12)',
      shadowBlur: selected ? 6 : 0,
      shadowOffset: selected
        ? {
            x: 0,
            y: 2,
          }
        : undefined,
    });
    text.on('click tap', (event) => {
      event.cancelBubble = true;
      if (!h.canEditGeometry) {
        return;
      }
      if (h.tool !== 'select') {
        return;
      }
      h.selectedElementId = e.id;
      h.selectedTable = null;
      h.selectedReserved = null;
      h.requestRender();
    });
    text.on('dragend', () => {
      e.x = text.x();
      e.y = text.y();
      e.updated_at = new Date().toISOString();
      h.pushHistory();
      h.requestRender();
    });
    h.layer.add(text);
  }

  private renderLineElement(e: FloorPlanElement): void {
    const h = this.host;
    const points = e.points ?? [e.x, e.y, e.x + e.width, e.y + e.height];
    const selected = h.selectedElementId === e.id;
    const line = new Konva.Line({
      points,
      stroke: selected ? '#8b5a3c' : String(e.kind) === 'wall' ? '#111111' : String(e.kind) === 'door' ? '#198754' : '#555555',
      strokeWidth: selected ? 16 : String(e.kind) === 'wall' ? 12 : 6,
      lineCap: 'round',
      lineJoin: 'round',
      draggable: elementsDraggable(h.canEditGeometry, h.tool),
      name: e.id,
    });
    line.on('click tap', (event) => {
      event.cancelBubble = true;
      if (!elementsDraggable(h.canEditGeometry, h.tool)) {
        return;
      }
      h.selectedElementId = e.id;
      h.selectedTable = null;
      h.selectedReserved = null;
      h.activeEndpoint = null;
      h.requestRender();
    });
    line.on('dragend', () => {
      if (h.activeEndpoint) {
        line.position({
          x: 0,
          y: 0,
        });
        return;
      }
      const dx = line.x();
      const dy = line.y();
      if (dx === 0 && dy === 0) {
        return;
      }
      moveLine(e, dx, dy);
      line.position({
        x: 0,
        y: 0,
      });
      h.pushHistory();
      h.requestRender();
    });
    h.layer.add(line);
    if (selected && elementsDraggable(h.canEditGeometry, h.tool)) {
      this.attachEndpointHandles(e, line);
    }
    if (e.label && String(e.kind) !== 'text') {
      h.layer.add(
        new Konva.Text({
          x: e.x,
          y: e.y,
          text: e.label,
          fill: '#111111',
          fontSize: 18,
        }),
      );
    }
  }

  private attachEndpointHandles(e: FloorPlanElement, line: Konva.Line): void {
    const h = this.host;
    const endpoints = getLineEndpoints(e);
    if (!endpoints) {
      return;
    }
    const startCircle = new Konva.Circle({
      x: endpoints.start.x,
      y: endpoints.start.y,
      radius: 9,
      fill: '#ffffff',
      stroke: '#8b5a3c',
      strokeWidth: 4,
      draggable: true,
      name: `${e.id}-start-endpoint`,
    });
    startCircle.on('mousedown touchstart', (event) => {
      event.cancelBubble = true;
      h.activeEndpoint = 'start';
      h.selectedElementId = e.id;
    });
    startCircle.on('dragstart', (event) => {
      event.cancelBubble = true;
      h.activeEndpoint = 'start';
    });
    startCircle.on('dragmove', (event) => {
      event.cancelBubble = true;
      const point = h.getStagePointerPoint(event.evt);
      if (!point) {
        return;
      }
      updateLineEndpoint(e, 'start', point);
      line.points(e.points ?? []);
      startCircle.position({
        x: point.x,
        y: point.y,
      });
      h.layer.batchDraw();
    });
    startCircle.on('dragend', (event) => {
      event.cancelBubble = true;
      const point = h.getStagePointerPoint(event.evt);
      if (point) {
        updateLineEndpoint(e, 'start', point);
      }
      h.activeEndpoint = null;
      h.endpointShape = null;
      h.pushHistory();
      h.requestRender();
    });
    const endCircle = new Konva.Circle({
      x: endpoints.end.x,
      y: endpoints.end.y,
      radius: 9,
      fill: '#ffffff',
      stroke: '#8b5a3c',
      strokeWidth: 4,
      draggable: true,
      name: `${e.id}-end-endpoint`,
    });
    endCircle.on('mousedown touchstart', (event) => {
      event.cancelBubble = true;
      h.activeEndpoint = 'end';
      h.selectedElementId = e.id;
    });
    endCircle.on('dragstart', (event) => {
      event.cancelBubble = true;
      h.activeEndpoint = 'end';
    });
    endCircle.on('dragmove', (event) => {
      event.cancelBubble = true;
      const point = h.getStagePointerPoint(event.evt);
      if (!point) {
        return;
      }
      updateLineEndpoint(e, 'end', point);
      line.points(e.points ?? []);
      endCircle.position({
        x: point.x,
        y: point.y,
      });
      h.layer.batchDraw();
    });
    endCircle.on('dragend', (event) => {
      event.cancelBubble = true;
      const point = h.getStagePointerPoint(event.evt);
      if (point) {
        updateLineEndpoint(e, 'end', point);
      }
      h.activeEndpoint = null;
      h.endpointShape = null;
      h.pushHistory();
      h.requestRender();
    });
    h.layer.add(startCircle);
    h.layer.add(endCircle);
    h.endpointShape = endCircle;
  }

  private renderZoneShape(e: FloorPlanElement): void {
    const h = this.host;
    const selected = h.selectedElementId === e.id;
    const stroke = selected ? '#8b5a3c' : '#6b4430';
    const fill = selected ? 'rgba(139, 90, 60, 0.12)' : 'rgba(107, 68, 48, 0.06)';
    const isEllipse = e.label === ZONE_SHAPE_ELLIPSE;

    const shape: Konva.Shape = isEllipse
      ? new Konva.Ellipse({
          x: e.x + e.width / 2,
          y: e.y + e.height / 2,
          radiusX: Math.max(1, e.width / 2),
          radiusY: Math.max(1, e.height / 2),
          stroke,
          strokeWidth: selected ? 4 : 3,
          fill,
          draggable: elementsDraggable(h.canEditGeometry, h.tool),
          name: e.id,
        })
      : new Konva.Rect({
          x: e.x,
          y: e.y,
          width: Math.max(1, e.width),
          height: Math.max(1, e.height),
          stroke,
          strokeWidth: selected ? 4 : 3,
          fill,
          draggable: elementsDraggable(h.canEditGeometry, h.tool),
          name: e.id,
        });

    shape.on('click tap', (event) => {
      event.cancelBubble = true;
      if (!elementsDraggable(h.canEditGeometry, h.tool)) {
        return;
      }
      h.selectedElementId = e.id;
      h.selectedTable = null;
      h.selectedReserved = null;
      h.activeEndpoint = null;
      h.requestRender();
    });

    shape.on('dragend', () => {
      if (isEllipse) {
        e.x = shape.x() - e.width / 2;
        e.y = shape.y() - e.height / 2;
      } else {
        e.x = shape.x();
        e.y = shape.y();
      }
      e.updated_at = new Date().toISOString();
      h.pushHistory();
      h.requestRender();
    });

    h.layer.add(shape);

    if (selected && elementsDraggable(h.canEditGeometry, h.tool)) {
      this.attachZoneResizeHandles(e, shape);
    }
  }

  private attachZoneResizeHandles(e: FloorPlanElement, shape: Konva.Shape): void {
    const h = this.host;
    const cornerKeys = ['nw', 'ne', 'sw', 'se'] as const;
    const handles: Konva.Rect[] = [];

    const syncHandles = (): void => {
      const positions = [
        { x: e.x, y: e.y },
        { x: e.x + e.width, y: e.y },
        { x: e.x, y: e.y + e.height },
        { x: e.x + e.width, y: e.y + e.height },
      ];
      handles.forEach((handle, index) => {
        handle.position({ x: positions[index].x - 6, y: positions[index].y - 6 });
      });
    };

    for (const key of cornerKeys) {
      const handle = new Konva.Rect({
        x: 0,
        y: 0,
        width: 12,
        height: 12,
        fill: '#ffffff',
        stroke: '#8b5a3c',
        strokeWidth: 3,
        draggable: true,
        name: `${e.id}-resize-${key}`,
      });

      handle.on('mousedown touchstart', (event) => {
        event.cancelBubble = true;
        h.selectedElementId = e.id;
      });
      handle.on('dragstart', (event) => {
        event.cancelBubble = true;
      });
      handle.on('dragmove', (event) => {
        event.cancelBubble = true;
        const point = h.getStagePointerPoint(event.evt);
        if (!point) {
          return;
        }
        this.applyZoneCornerResize(e, key, point);
        this.syncZoneShapeNode(e, shape);
        syncHandles();
        h.layer.batchDraw();
      });
      handle.on('dragend', (event) => {
        event.cancelBubble = true;
        const point = h.getStagePointerPoint(event.evt);
        if (point) {
          this.applyZoneCornerResize(e, key, point);
        }
        e.updated_at = new Date().toISOString();
        h.pushHistory();
        h.requestRender();
      });
      handles.push(handle);
      h.layer.add(handle);
    }
    syncHandles();
  }

  private syncZoneShapeNode(e: FloorPlanElement, shape: Konva.Shape): void {
    if (e.label === ZONE_SHAPE_ELLIPSE) {
      shape.position({ x: e.x + e.width / 2, y: e.y + e.height / 2 });
      (shape as Konva.Ellipse).radiusX(Math.max(1, e.width / 2));
      (shape as Konva.Ellipse).radiusY(Math.max(1, e.height / 2));
      return;
    }
    shape.position({ x: e.x, y: e.y });
    shape.size({ width: Math.max(1, e.width), height: Math.max(1, e.height) });
  }

  private applyZoneCornerResize(
    e: FloorPlanElement,
    corner: string,
    point: { x: number; y: number },
  ): void {
    const min = 16;
    let left = e.x;
    let top = e.y;
    let right = e.x + e.width;
    let bottom = e.y + e.height;

    if (corner.includes('w')) left = point.x;
    if (corner.includes('e')) right = point.x;
    if (corner.includes('n')) top = point.y;
    if (corner.includes('s')) bottom = point.y;

    e.x = Math.min(left, right);
    e.y = Math.min(top, bottom);
    e.width = Math.max(min, Math.abs(right - left));
    e.height = Math.max(min, Math.abs(bottom - top));
  }

  renderTable(t: ClubTable): void {
    const h = this.host;
    const active = h.selectedTable?.id === t.id;
    const hasProducts = (h.orderCountMap.get(t.id) ?? 0) > 0;
    const common = {
      rotation: t.rotation,
      draggable: elementsDraggable(h.canEditGeometry, h.tool),
      name: t.id,
      fill: this.tableColor(t, hasProducts),
      stroke: active ? '#b8925e' : '#000000',
      strokeWidth: active ? 4 : 3,
    };
    const shape: Konva.Shape =
      t.shape === 'circle'
        ? new Konva.Circle({
            ...common,
            x: t.x + t.width / 2,
            y: t.y + t.height / 2,
            radius: Math.min(t.width, t.height) / 2,
          })
        : new Konva.Rect({
            ...common,
            x: t.x,
            y: t.y,
            width: t.width,
            height: t.height,
            cornerRadius: 10,
          });
    shape.on('click tap', (event) => {
      event.cancelBubble = true;
      h.onSelectTable(t);
    });
    shape.on('dragend', () => {
      if (!h.canEditGeometry) {
        return;
      }
      if (t.shape === 'circle') {
        t.x = shape.x() - t.width / 2;
        t.y = shape.y() - t.height / 2;
      } else {
        t.x = shape.x();
        t.y = shape.y();
      }
      t.updated_at = new Date().toISOString();
      h.selectedElementId = null;
      h.selectedReserved = null;
      h.pushHistory();
      h.requestRender();
    });
    h.layer.add(shape);
    const pendingQty = h.pendingMap?.get(t.id) ?? 0;
    const needsAttention =
      !t.attended && (pendingQty > 0 || Boolean((t.observation ?? '').trim()));
    const statusHint = needsAttention
      ? 'PENDIENTE'
      : t.attended
        ? 'ATENDIDA'
        : t.reserved
          ? 'RESERVADA'
          : null;
    const isCircle = t.shape === 'circle';
    const diameter = Math.min(t.width, t.height);
    const textWidth = isCircle ? diameter : t.width;
    const textHeight = isCircle ? diameter : t.height;
    const textX = isCircle ? t.x + (t.width - diameter) / 2 : t.x;
    const textY = isCircle ? t.y + (t.height - diameter) / 2 : t.y;
    // Fit status labels (e.g. RESERVADA) inside the circle diameter.
    const statusFont = Math.max(10, Math.min(14, Math.floor(diameter / 8)));
    const numberText = new Konva.Text({
      x: textX,
      y: textY,
      text: statusHint ? `${t.number}\n${statusHint}` : `${t.number}`,
      fill: '#ffffff',
      fontSize: statusHint ? statusFont : Math.max(14, Math.min(18, Math.floor(diameter / 5))),
      fontStyle: 'bold',
      width: textWidth,
      height: textHeight,
      align: 'center',
      verticalAlign: 'middle',
      listening: false,
      lineHeight: 1.15,
      padding: isCircle ? 4 : 0,
    });
    shape.on('dragmove', () => {
      if (isCircle) {
        numberText.position({
          x: shape.x() - diameter / 2,
          y: shape.y() - diameter / 2,
        });
      } else {
        numberText.position({
          x: shape.x(),
          y: shape.y(),
        });
      }
      h.layer.batchDraw();
    });
    h.layer.add(numberText);
  }

  renderReserved(r: ClubTable): void {
    const h = this.host;
    const active = h.selectedReserved?.id === r.id;
    const hasProducts = (h.orderCountMap.get(r.id) ?? 0) > 0;
    const fill = this.tableColor(r, hasProducts, PlanEditorRenderer.RESERVED_BLOCK_COLOR);
    const idleStroke =
      fill === PlanEditorRenderer.RESERVED_STATUS_COLOR
        ? '#b8925e'
        : fill === '#9f2f3a'
          ? '#7a2430'
          : fill === '#4c8b62'
            ? '#3a6b4c'
            : '#5c4570';
    const shape = new Konva.Rect({
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      rotation: r.rotation,
      cornerRadius: 14,
      fill,
      stroke: active ? '#d4af7c' : idleStroke,
      strokeWidth: active ? 5 : 3,
      draggable: elementsDraggable(h.canEditGeometry, h.tool),
      name: r.id,
      shadowColor: 'rgba(0,0,0,.15)',
      shadowBlur: active ? 8 : 3,
      shadowOffset: {
        x: 0,
        y: 2,
      },
    });
    shape.on('click tap', (event) => {
      event.cancelBubble = true;
      h.onSelectReserved(r);
    });
    shape.on('dragend', () => {
      if (!h.canEditGeometry) {
        return;
      }
      r.x = shape.x();
      r.y = shape.y();
      r.updated_at = new Date().toISOString();
      h.selectedElementId = null;
      h.selectedTable = null;
      h.pushHistory();
      h.requestRender();
    });
    h.layer.add(shape);
    const pendingQtyR = h.pendingMap?.get(r.id) ?? 0;
    const needsAttentionR =
      !r.attended && (pendingQtyR > 0 || Boolean((r.observation ?? '').trim()));
    const stateLine = needsAttentionR
      ? 'PENDIENTE'
      : r.attended
        ? 'ATENDIDO'
        : r.reserved
          ? 'RESERVADA'
          : 'DISPONIBLE';
    const reservedText = new Konva.Text({
      x: r.x,
      y: r.y,
      text: `RESERVADO ${r.number}\n${stateLine}`,
      fill: '#ffffff',
      fontSize: 14,
      fontStyle: 'bold',
      width: r.width,
      height: r.height,
      align: 'center',
      verticalAlign: 'middle',
      listening: false,
      lineHeight: 1.15,
    });
    shape.on('dragmove', () => {
      reservedText.position({
        x: shape.x(),
        y: shape.y(),
      });
      h.layer.batchDraw();
    });
    h.layer.add(reservedText);
  }
}
