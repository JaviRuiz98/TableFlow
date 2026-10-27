/**
 * Zoom / fit / pinch helpers for PlanEditor.
 * Operates on a Stage owned by PlanEditor; does not create or destroy Stage.
 */
import {
  VIEWPORT,
  clampZoom,
  clientPointsRelativeToRect,
  computeFitInitialView,
  computePinchViewport,
  computeZoomAroundPoint,
  contentExtent,
} from '../canvas';
import type { PlanEditorHost } from './plan-editor-host';

export class PlanEditorViewport {
  private readonly absoluteMinZoom: number = VIEWPORT.absoluteMinZoom;
  private readonly defaultMinZoom: number = VIEWPORT.defaultMinZoom;
  private readonly maxZoom: number = VIEWPORT.maxZoom;
  minZoom: number = this.defaultMinZoom;
  initialViewPending = true;
  private pinchLastDistance = 0;
  private pinchLastCenter: { x: number; y: number } | null = null;

  constructor(private readonly host: PlanEditorHost) {}

  get canZoomOut(): boolean {
    const stage = this.host.stage;
    if (!stage) return false;
    return stage.scaleX() > this.minZoom + 0.001;
  }

  get canZoomIn(): boolean {
    const stage = this.host.stage;
    if (!stage) return true;
    return stage.scaleX() < this.maxZoom - 0.001;
  }

  zoom(delta: number): void {
    const stage = this.host.stage;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const nextScale = clampZoom(oldScale + delta, this.minZoom, this.maxZoom);
    if (Math.abs(nextScale - oldScale) < VIEWPORT.scaleEpsilon) return;

    const center = { x: stage.width() / 2, y: stage.height() / 2 };
    this.zoomAroundPoint(center, nextScale);
    this.host.cdr.detectChanges();
  }

  zoomAtPointer(event: WheelEvent, delta: number): void {
    const stage = this.host.stage;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const newScale = clampZoom(oldScale + delta, this.minZoom, this.maxZoom);
    if (Math.abs(newScale - oldScale) < VIEWPORT.scaleEpsilon) return;
    const pointer = stage.getPointerPosition() ?? { x: stage.width() / 2, y: stage.height() / 2 };
    this.zoomAroundPoint(pointer, newScale);
    this.host.cdr.detectChanges();
  }

  zoomAroundPoint(point: { x: number; y: number }, newScale: number): void {
    const stage = this.host.stage;
    if (!stage) return;
    const oldScale = stage.scaleX() || 1;
    const { scale, position } = computeZoomAroundPoint(
      point,
      stage.x(),
      stage.y(),
      oldScale,
      newScale,
    );
    stage.scale({ x: scale, y: scale });
    stage.position(position);
    stage.batchDraw();
  }

  fitInitialView(): void {
    const stage = this.host.stage;
    if (!stage || !this.initialViewPending) return;
    this.initialViewPending = false;

    const { plan, tables, reserved, elements } = this.host;
    const fit = computeFitInitialView({
      planWidth: Number(plan?.width) || 0,
      planHeight: Number(plan?.height) || 0,
      extentX: contentExtent('x', tables, reserved, elements),
      extentY: contentExtent('y', tables, reserved, elements),
      stageWidth: stage.width(),
      stageHeight: stage.height(),
      absoluteMinZoom: this.absoluteMinZoom,
      defaultMinZoom: this.defaultMinZoom,
    });
    this.minZoom = fit.minZoom;
    stage.scale({ x: fit.scale, y: fit.scale });
    stage.position(fit.position);
    stage.batchDraw();
    this.host.cdr.detectChanges();
  }

  installTouchNavigation(): void {
    const stage = this.host.stage;
    if (!stage) return;

    stage.on('touchmove.mobile-nav', (event) => {
      const touches = (event.evt as TouchEvent).touches;
      if (touches.length !== 2) return;
      event.evt.preventDefault();
      stage.stopDrag();

      const rect = this.host.container.nativeElement.getBoundingClientRect();
      const { center, distance } = clientPointsRelativeToRect(
        { x: touches[0].clientX, y: touches[0].clientY },
        { x: touches[1].clientX, y: touches[1].clientY },
        rect,
      );

      if (this.pinchLastDistance > 0 && this.pinchLastCenter) {
        const oldScale = stage.scaleX() || 1;
        const nextScale = clampZoom(
          oldScale * (distance / this.pinchLastDistance),
          this.minZoom,
          this.maxZoom,
        );
        const { scale, position } = computePinchViewport(
          this.pinchLastCenter,
          center,
          stage.x(),
          stage.y(),
          oldScale,
          nextScale,
        );
        stage.scale({ x: scale, y: scale });
        stage.position(position);
        stage.batchDraw();
      }

      this.pinchLastDistance = distance;
      this.pinchLastCenter = center;
    });

    stage.on('touchend.mobile-nav touchcancel.mobile-nav', () => {
      this.pinchLastDistance = 0;
      this.pinchLastCenter = null;
      stage.draggable(this.host.panMode);
      this.host.cdr.detectChanges();
    });
  }
}
