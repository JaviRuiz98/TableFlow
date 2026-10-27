/**
 * Freehand wall drawing draft for PlanEditor (draft Layer only).
 * Stage / main layer remain owned by PlanEditor.
 */
import Konva from 'konva';
import type { GeometryService } from './geometry';
import {
  buildWallElementsFromSegments,
  pointerDownAction,
  shouldAppendDrawingPoint,
} from './tools';
import type { PlanEditorHost } from './plan-editor-host';

export class PlanEditorDrawing {
  private drawingShape: Konva.Line | null = null;
  private drawingPointerId: number | null = null;

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
