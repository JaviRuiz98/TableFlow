import { TestBed } from '@angular/core/testing';
import { GeometryService } from './geometry.service';

describe('GeometryService (PlanEditor drawing characterization)', () => {
  let service: GeometryService;
  beforeEach(() => {
    service = TestBed.inject(GeometryService);
  });

  it('simplifies a nearly straight path', () => {
    const out = service.simplify(
      [
        { x: 0, y: 0 },
        { x: 50, y: 2 },
        { x: 100, y: 0 },
      ],
      5,
    );
    expect(out.length).toBe(2);
  });

  it('leaves short polylines unchanged', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(service.simplify(points)).toEqual(points);
  });

  it('keeps coincident midpoints that still fail area threshold as endpoints-only path', () => {
    const out = service.simplify(
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      12,
    );
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[out.length - 1]).toEqual({ x: 10, y: 0 });
  });

  it('snapOrthogonal keeps endpoints and flattens near-horizontal midpoints', () => {
    const out = service.snapOrthogonal(
      [
        { x: 0, y: 0 },
        { x: 50, y: 3 },
        { x: 100, y: 0 },
      ],
      18,
    );
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[2]).toEqual({ x: 100, y: 0 });
    expect(out[1].y).toBe(0);
  });

  it('snapOrthogonal snaps near-vertical midpoints toward shared x', () => {
    const out = service.snapOrthogonal(
      [
        { x: 0, y: 0 },
        { x: 2, y: 50 },
        { x: 0, y: 100 },
      ],
      18,
    );
    expect(out[1].x).toBe(0);
    expect(out[1].y).toBe(50);
  });

  it('snapOrthogonal uses prev→next chord (quirk): V midpoint snaps to chord y even if visually diagonal', () => {
    // Chord (0,0)→(100,0) is horizontal → midpoint forced to y=0 (production behaviour).
    const points = [
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 0 },
    ];
    expect(service.snapOrthogonal(points, 18)[1]).toEqual({ x: 50, y: 0 });
  });

  it('toSegments builds horizontal then vertical segments with min size 4', () => {
    const out = service.toSegments([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]);
    expect(out.length).toBe(2);
    expect(out[0].points).toEqual([0, 0, 100, 0]);
    expect(out[1].points).toEqual([100, 0, 100, 100]);
    expect(out[0].width).toBe(100);
    expect(out[0].height).toBe(4); // max(|dy|, 4) with dy=0
  });

  it('toSegments handles decimals and negative coordinates', () => {
    const out = service.toSegments([
      { x: -10.5, y: -2.25 },
      { x: 3.25, y: -2.25 },
    ]);
    expect(out.length).toBe(1);
    expect(out[0].points).toEqual([-10.5, -2.25, 3.25, -2.25]);
    expect(out[0].x).toBe(-10.5);
    expect(out[0].y).toBe(-2.25);
  });

  it('toSegments on zero-length pair still emits a segment with min dimensions', () => {
    const out = service.toSegments([
      { x: 5, y: 5 },
      { x: 5, y: 5 },
    ]);
    expect(out.length).toBe(1);
    expect(out[0].width).toBe(4);
    expect(out[0].height).toBe(4);
    expect(out[0].points).toEqual([5, 5, 5, 5]);
  });

  /**
   * Documented quirk (do not “fix” in B8.2): snapOrthogonal uses the angle of
   * prev→next, not consecutive edges, so some bent polylines snap midpoints
   * in ways that look odd but match production drawing.
   */
  it('preserves current snapOrthogonal behaviour on a bent polyline (known quirk)', () => {
    const out = service.snapOrthogonal([
      { x: 0, y: 0 },
      { x: 20, y: 1 },
      { x: 40, y: 0 },
      { x: 40, y: 40 },
    ]);
    expect(out.length).toBe(4);
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[3]).toEqual({ x: 40, y: 40 });
  });
});
