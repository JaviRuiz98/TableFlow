/**
 * Freehand wall drawing + click-drag zone shapes for PlanEditor (draft Layer only).
 * Stage / main layer remain owned by PlanEditor.
 */
import Konva from 'konva';
import type { GeometryService } from '../geometry';
import {
  bboxFromCorners,
  buildWallElementsFromSegments,
  buildZoneShapeElement,
  pointerDownAction,
  shouldAppendDrawingPoint,
  ZONE_SHAPE_ELLIPSE,
  ZONE_SHAPE_RECT,
  type ZoneShapeKind,
} from '../tools';
import type { PlanEditorHost } from './plan-editor-host';

export class PlanEditorDrawing {
  private drawingShape: Konva.Line | null = null;
  private drawingPointerId: number | null = null;

  private shapeKind: ZoneShapeKind | null = null;
  private shapeOrigin: { x: number; y: number } | null = null;
  private shapePreview: Konva.Rect | Konva.Ellipse | null = null;
  private shapePointerId: number | null = null;

  constructor(
    private readonly host: PlanEditorHost,
    private readonly geometry: GeometryService,
  ) {}

  pointerDown(ev: PointerEvent): void {
    const action = pointerDownAction(this.host.mode, this.host.tool);
    if (action === 'text') {
      const point = this.host.getCanvasPoint(ev);
      if (!point) {
        return;
      }
      this.host.openTextDialog(point);
      return;
    }
    if (action === 'rect' || action === 'ellipse') {
      const p = this.host.getCanvasPoint(ev);
      if (!p) {
        return;
      }
      this.startShapeAt(action, p, ev.pointerId);
      return;
    }
    if (action !== 'draw') {
      return;
    }
    const p = this.host.getCanvasPoint(ev);
    if (!p) {
      return;
    }
    this.drawingPointerId = ev.pointerId;
    this.startDrawingAt(p);
  }

  pointerMove(ev: PointerEvent): void {
    if (this.shapePointerId === ev.pointerId && this.shapeOrigin && this.shapePreview) {
      const p = this.host.getCanvasPoint(ev);
      if (!p) {
        return;
      }
      this.updateShapePreview(p);
      return;
    }
    if (this.drawingPointerId !== ev.pointerId || !this.drawingShape) {
      return;
    }
    const p = this.host.getCanvasPoint(ev);
    if (!p) {
      return;
    }
    const last = this.host.drawing[this.host.drawing.length - 1];
    if (!shouldAppendDrawingPoint(last, p)) {
      return;
    }
    this.host.drawing.push({
      x: p.x,
      y: p.y,
    });
    this.drawingShape.points(this.host.drawing.flatMap((point) => [point.x, point.y]));
    this.host.draftLayer.batchDraw();
  }

  pointerUp(ev: PointerEvent): void {
    if (this.shapePointerId === ev.pointerId) {
      const p = this.host.getCanvasPoint(ev) ?? this.shapeOrigin;
      this.commitShape(p);
      return;
    }
    if (this.drawingPointerId !== ev.pointerId) {
      return;
    }
    this.drawingPointerId = null;
    if (!this.drawingShape || this.host.drawing.length < 2) {
      this.clearDrawing();
      return;
    }
    this.commitDrawingSegments();
  }

  /** Commit current stroke as wall elements (also used by saveDesign). */
  convertDrawing(selectAfter = false): void {
    if (this.host.drawing.length < 2) {
      return;
    }
    this.commitDrawingSegments();
    if (selectAfter) {
      this.host.setTool('select');
    }
  }

  clearDrawing(): void {
    this.host.drawing = [];
    this.drawingShape = null;
    this.drawingPointerId = null;
    this.shapeKind = null;
    this.shapeOrigin = null;
    this.shapePreview = null;
    this.shapePointerId = null;
    if (this.host.draftLayer) {
      this.host.draftLayer.destroyChildren();
      this.host.draftLayer.draw();
    }
  }

  private startDrawingAt(point: { x: number; y: number }): void {
    this.host.drawing = [point];
    this.drawingShape = new Konva.Line({
      points: [point.x, point.y],
      stroke: '#111111',
      strokeWidth: 6,
      dash: [10, 8],
      lineCap: 'round',
      lineJoin: 'round',
    });
    this.host.draftLayer.add(this.drawingShape);
    this.host.draftLayer.draw();
  }

  private startShapeAt(
    kind: ZoneShapeKind,
    point: { x: number; y: number },
    pointerId: number,
  ): void {
    this.clearDrawing();
    this.shapeKind = kind;
    this.shapeOrigin = point;
    this.shapePointerId = pointerId;
    if (kind === ZONE_SHAPE_RECT) {
      this.shapePreview = new Konva.Rect({
        x: point.x,
        y: point.y,
        width: 1,
        height: 1,
        stroke: '#8b5a3c',
        strokeWidth: 3,
        dash: [8, 6],
        fill: 'rgba(139, 90, 60, 0.08)',
      });
    } else {
      this.shapePreview = new Konva.Ellipse({
        x: point.x,
        y: point.y,
        radiusX: 1,
        radiusY: 1,
        stroke: '#8b5a3c',
        strokeWidth: 3,
        dash: [8, 6],
        fill: 'rgba(139, 90, 60, 0.08)',
      });
    }
    this.host.draftLayer.add(this.shapePreview);
    this.host.draftLayer.draw();
  }

  private updateShapePreview(corner: { x: number; y: number }): void {
    if (!this.shapeOrigin || !this.shapePreview || !this.shapeKind) {
      return;
    }
    const box = bboxFromCorners(this.shapeOrigin, corner);
    if (this.shapeKind === ZONE_SHAPE_RECT && this.shapePreview instanceof Konva.Rect) {
      this.shapePreview.position({ x: box.x, y: box.y });
      this.shapePreview.size({ width: Math.max(1, box.width), height: Math.max(1, box.height) });
    } else if (
      this.shapeKind === ZONE_SHAPE_ELLIPSE &&
      this.shapePreview instanceof Konva.Ellipse
    ) {
      this.shapePreview.position({
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
      });
      this.shapePreview.radiusX(Math.max(1, box.width / 2));
      this.shapePreview.radiusY(Math.max(1, box.height / 2));
    }
    this.host.draftLayer.batchDraw();
  }

  private commitShape(corner: { x: number; y: number } | null): void {
    const origin = this.shapeOrigin;
    const kind = this.shapeKind ?? ZONE_SHAPE_RECT;
    this.shapePointerId = null;
    if (!origin || !corner) {
      this.clearDrawing();
      return;
    }
    const element = buildZoneShapeElement({
      planId: this.host.plan.id,
      shape: kind,
      origin,
      corner,
      zIndex: this.host.elements.length,
      now: new Date().toISOString(),
    });
    this.clearDrawing();
    if (!element) {
      return;
    }
    this.host.elements = [...this.host.elements, element];
    this.host.selectedElementId = element.id;
    this.host.selectedTable = null;
    this.host.selectedReserved = null;
    this.host.pushHistory();
    this.host.requestRender();
  }

  private commitDrawingSegments(): void {
    const segments = this.geometry.toSegments(this.host.drawing);
    const now = new Date().toISOString();
    const newElements = buildWallElementsFromSegments({
      segments,
      planId: this.host.plan.id,
      zIndexStart: this.host.elements.length,
      now,
    });
    this.host.elements = [...this.host.elements, ...newElements];
    this.clearDrawing();
    this.host.pushHistory();
    this.host.requestRender();
  }
}
