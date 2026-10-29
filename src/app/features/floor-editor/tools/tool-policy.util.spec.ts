import {
  canEditPlanGeometry,
  elementsDraggable,
  planToolTransition,
  pointerDownAction,
  shouldAppendDrawingPoint,
  toolLabel,
} from './tool-policy.util';

describe('tool-policy.util (PlanEditor characterization)', () => {
  it('canEditPlanGeometry requires ADMIN + editor + unlocked', () => {
    expect(canEditPlanGeometry({ isAdmin: true, mode: 'editor', isLocked: false })).toBe(true);
    expect(canEditPlanGeometry({ isAdmin: false, mode: 'editor', isLocked: false })).toBe(false);
    expect(canEditPlanGeometry({ isAdmin: true, mode: 'operativo', isLocked: false })).toBe(false);
    expect(canEditPlanGeometry({ isAdmin: true, mode: 'editor', isLocked: true })).toBe(false);
  });

  it('rejects draw/text/shapes when geometry locked; allows select/pan', () => {
    expect(planToolTransition('draw', false).applied).toBe(false);
    expect(planToolTransition('text', false).applied).toBe(false);
    expect(planToolTransition('rect', false).applied).toBe(false);
    expect(planToolTransition('ellipse', false).applied).toBe(false);
    expect(planToolTransition('select', false)).toMatchObject({
      applied: true,
      panMode: false,
      clearSelection: false,
      clearDrawing: true,
    });
    expect(planToolTransition('pan', true)).toMatchObject({
      applied: true,
      panMode: true,
      clearSelection: true,
      clearDrawing: true,
    });
  });

  it('draw keeps freehand draft; shapes/select clear drawing', () => {
    expect(planToolTransition('draw', true)).toMatchObject({
      clearDrawing: false,
      clearSelection: true,
    });
    expect(planToolTransition('rect', true)).toMatchObject({
      clearDrawing: true,
      clearSelection: true,
    });
    expect(planToolTransition('select', true)).toMatchObject({
      clearDrawing: true,
      clearSelection: false,
    });
  });

  it('toolLabel matches UI strings', () => {
    expect(toolLabel('select')).toBe('Seleccionar');
    expect(toolLabel('draw')).toBe('Dibujar paredes');
    expect(toolLabel('text')).toBe('Añadir texto');
    expect(toolLabel('pan')).toBe('Mover plano');
    expect(toolLabel('rect')).toBe('Rectángulo');
    expect(toolLabel('ellipse')).toBe('Óvalo');
  });

  it('elementsDraggable only in select with edit rights', () => {
    expect(elementsDraggable(true, 'select')).toBe(true);
    expect(elementsDraggable(true, 'draw')).toBe(false);
    expect(elementsDraggable(true, 'rect')).toBe(false);
    expect(elementsDraggable(false, 'select')).toBe(false);
  });

  it('shouldAppendDrawingPoint respects min distance 4', () => {
    expect(shouldAppendDrawingPoint(undefined, { x: 0, y: 0 })).toBe(true);
    expect(shouldAppendDrawingPoint({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(false);
    expect(shouldAppendDrawingPoint({ x: 0, y: 0 }, { x: 4, y: 0 })).toBe(true);
  });

  it('pointerDownAction maps mode+tool', () => {
    expect(pointerDownAction('editor', 'text')).toBe('text');
    expect(pointerDownAction('editor', 'draw')).toBe('draw');
    expect(pointerDownAction('editor', 'rect')).toBe('rect');
    expect(pointerDownAction('editor', 'ellipse')).toBe('ellipse');
    expect(pointerDownAction('operativo', 'draw')).toBe('ignore');
    expect(pointerDownAction('editor', 'select')).toBe('ignore');
  });
});
