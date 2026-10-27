import { vi } from 'vitest';
import { applyStageSizeIfChanged, teardownStageResources } from './stage-lifecycle.util';

describe('stage-lifecycle.util', () => {
  it('teardownStageResources disconnects observer, cancels rAF, destroys stage', () => {
    const disconnect = vi.fn();
    const destroy = vi.fn();
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => undefined);

    teardownStageResources({
      stage: { destroy } as never,
      resizeObserver: { disconnect } as never,
      resizeFrame: 42,
    });

    expect(disconnect).toHaveBeenCalled();
    expect(cancelSpy).toHaveBeenCalledWith(42);
    expect(destroy).toHaveBeenCalled();
    cancelSpy.mockRestore();
  });

  it('applyStageSizeIfChanged skips when size unchanged', () => {
    const stage = {
      width: () => 800,
      height: () => 500,
      size: vi.fn(),
      batchDraw: vi.fn(),
    };
    expect(applyStageSizeIfChanged(stage, 800, 100)).toBe(false); // height floored to 500
    expect(stage.size).not.toHaveBeenCalled();
  });

  it('applyStageSizeIfChanged updates and redraws when size changes', () => {
    const stage = {
      width: () => 100,
      height: () => 500,
      size: vi.fn(),
      batchDraw: vi.fn(),
    };
    expect(applyStageSizeIfChanged(stage, 400, 600)).toBe(true);
    expect(stage.size).toHaveBeenCalledWith({ width: 400, height: 600 });
    expect(stage.batchDraw).toHaveBeenCalled();
  });
});
