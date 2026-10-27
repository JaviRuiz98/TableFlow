/**
 * Konva scene painter for PlanEditor.
 * PlanEditor remains sole Stage owner; this class only paints into a Layer
 * and mutates model/selection through the host.
 */
import Konva from 'konva';
import { getLineEndpoints, moveLine, updateLineEndpoint } from './geometry';
import { elementsDraggable } from './tools';
import type { ClubTable, FloorPlanElement } from '../../core/models/models';
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

  /**
   * Colores de mesa/reservado en modo operativo:
   *  - Sin productos              -> color normal (el mismo que en editor)
   *  - Con productos y atendida   -> verde
   *  - Con productos y no atendida-> rojo
   */
  tableColor(t: ClubTable, hasProducts: boolean, normalColor = '#111111'): string {
    if (!hasProducts) {
      return normalColor;
    }
    return t.attended ? '#4c8b62' : '#9f2f3a';
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

  renderTable(t: ClubTable): void {
    const h = this.host;
    const active = h.selectedTable?.id === t.id;
    const hasProducts = (h.orderCountMap.get(t.id) ?? 0) > 0;
    const common = {
      rotation: t.rotation,
      draggable: elementsDraggable(h.canEditGeometry, h.tool),
      name: t.id,
      fill: this.tableColor(t, hasProducts),
      stroke: active ? '#704936' : '#000000',
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
    const numberText = new Konva.Text({
      x: t.x,
      y: t.y,
      text: `${t.number}`,
      fill: '#ffffff',
      fontSize: 18,
      fontStyle: 'bold',
      width: t.width,
      height: t.height,
      align: 'center',
      verticalAlign: 'middle',
      listening: false,
    });
    shape.on('dragmove', () => {
      if (t.shape === 'circle') {
        numberText.position({
          x: shape.x() - t.width / 2,
          y: shape.y() - t.height / 2,
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
    const shape = new Konva.Rect({
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      rotation: r.rotation,
      cornerRadius: 14,
      fill: this.tableColor(r, hasProducts, '#704936'),
      stroke: active ? '#3d2417' : '#704936',
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
    const reservedText = new Konva.Text({
      x: r.x,
      y: r.y,
      text: `RESERVADO\n${r.number}`,
      fill: '#ffffff',
      fontSize: 16,
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
