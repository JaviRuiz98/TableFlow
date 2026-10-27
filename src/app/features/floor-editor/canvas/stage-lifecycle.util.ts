import type Konva from 'konva';
import { measureStageSize } from './viewport.util';

export interface StageTeardownHandles {
  stage: Konva.Stage | null | undefined;
  resizeObserver: ResizeObserver | null | undefined;
  resizeFrame: number | null;
}

/**
 * Disconnect resize observation, cancel pending rAF, destroy Konva stage.
 * PlanEditor remains the sole owner; call this from ngOnDestroy / before recreating stage.
 */
export function teardownStageResources(handles: StageTeardownHandles): void {
  handles.resizeObserver?.disconnect();
  if (handles.resizeFrame !== null) {
    cancelAnimationFrame(handles.resizeFrame);
  }
  handles.stage?.destroy();
}

/** Size for a new Stage from container element metrics. */
export function stageSizeFromElement(el: { clientWidth: number; clientHeight: number }) {
  return measureStageSize(el.clientWidth, el.clientHeight);
}

/**
 * Apply container size to an existing stage when dimensions change.
 * Returns whether size was updated (same skip rule as PlanEditor.observeStageSize).
 */
export function applyStageSizeIfChanged(
  stage: { width: () => number; height: () => number; size: (s: { width: number; height: number }) => void; batchDraw: () => void },
  clientWidth: number,
  clientHeight: number,
): boolean {
  const { width: nextWidth, height: nextHeight } = measureStageSize(clientWidth, clientHeight);
  if (stage.width() === nextWidth && stage.height() === nextHeight) return false;
  stage.size({ width: nextWidth, height: nextHeight });
  stage.batchDraw();
  return true;
}
