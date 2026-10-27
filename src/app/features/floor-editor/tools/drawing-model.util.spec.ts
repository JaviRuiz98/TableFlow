import {
  buildTextElement,
  buildWallElementsFromSegments,
  normalizeTextFontSize,
  shouldUpdateTextFontSize,
} from './drawing-model.util';

describe('drawing-model.util (PlanEditor characterization)', () => {
  it('buildWallElementsFromSegments preserves segment geometry and sequential z_index', () => {
    const elements = buildWallElementsFromSegments({
      segments: [
        { x: 0, y: 0, width: 100, height: 4, rotation: 0, points: [0, 0, 100, 0] },
        { x: 100, y: 0, width: 4, height: 50, rotation: 0, points: [100, 0, 100, 50] },
      ],
      planId: 'plan-1',
      zIndexStart: 3,
      now: '2020-01-01T00:00:00.000Z',
      newId: (() => {
        let n = 0;
        return () => `wall-${++n}`;
      })(),
    });
    expect(elements).toHaveLength(2);
    expect(elements[0].id).toBe('wall-1');
    expect(elements[0].kind).toBe('wall');
    expect(elements[0].z_index).toBe(3);
    expect(elements[1].z_index).toBe(4);
    expect(elements[0].points).toEqual([0, 0, 100, 0]);
    expect(elements[0].created_at).toBe('2020-01-01T00:00:00.000Z');
  });

  it('buildTextElement sets defaults and keeps position', () => {
    const el = buildTextElement({
      planId: 'p',
      position: { x: 12.5, y: -3 },
      label: 'VIP',
      zIndex: 7,
      now: 't0',
      newId: () => 'text-1',
    });
    expect(el).toMatchObject({
      id: 'text-1',
      kind: 'text',
      x: 12.5,
      y: -3,
      label: 'VIP',
      font_size: 22,
      points: null,
      z_index: 7,
    });
  });

  it('normalizeTextFontSize clamps and rejects non-finite', () => {
    expect(normalizeTextFontSize('abc')).toBeNull();
    expect(normalizeTextFontSize(7)).toBe(8);
    expect(normalizeTextFontSize(121)).toBe(120);
    expect(normalizeTextFontSize(22.4)).toBe(22);
  });

  it('shouldUpdateTextFontSize treats null current as 22', () => {
    expect(shouldUpdateTextFontSize(null, 22)).toBe(false);
    expect(shouldUpdateTextFontSize(22, 24)).toBe(true);
  });
});
