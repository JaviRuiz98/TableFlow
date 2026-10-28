import { initialWorkspacePresentation } from './workspace-init.util';
import type { FloorPlan } from '../../../core/models/models';

function plan(id: string): FloorPlan {
  return {
    id,
    name: id,
    width: 100,
    height: 100,
    is_active: true,
    is_locked: false,
    company_id: 'company-1',
    created_at: 't',
    updated_at: 't',
  };
}

describe('initialWorkspacePresentation', () => {
  it('USER (manager) opens planos without receptor alerts', () => {
    const init = initialWorkspacePresentation(
      { isAdmin: false, isManager: true, isReceptor: false },
      [plan('a')],
    );
    expect(init).toEqual({
      activeTab: 'planos',
      editorMode: 'operativo',
      showMap: true,
      selectedPlan: null,
      subscribeReceptorOrderAlerts: false,
    });
  });

  it('ADMIN opens planos like manager (sala access)', () => {
    const init = initialWorkspacePresentation(
      { isAdmin: true, isManager: false, isReceptor: false },
      [plan('a')],
    );
    expect(init.activeTab).toBe('planos');
    expect(init.showMap).toBe(true);
    expect(init.subscribeReceptorOrderAlerts).toBe(false);
  });

  it('RECEPTOR opens operativa with alerts on first plan', () => {
    const plans = [plan('a'), plan('b')];
    const init = initialWorkspacePresentation(
      { isAdmin: false, isManager: false, isReceptor: true },
      plans,
    );
    expect(init.activeTab).toBe('operativo');
    expect(init.showMap).toBe(false);
    expect(init.selectedPlan).toBe(plans[0]);
    expect(init.subscribeReceptorOrderAlerts).toBe(true);
  });

  it('RECEPTOR with empty plans keeps selectedPlan null', () => {
    expect(
      initialWorkspacePresentation({ isAdmin: false, isManager: false, isReceptor: true }, [])
        .selectedPlan,
    ).toBeNull();
  });
});
