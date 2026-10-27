import { initialWorkspacePresentation } from './workspace-init.util';
import type { FloorPlan } from '../../core/models/models';

const plan = (id: string): FloorPlan => ({
  id,
  name: id,
  width: 100,
  height: 100,
  is_active: false,
  is_locked: false,
  created_by: 'u',
  created_at: '',
  updated_at: '',
});

describe('initialWorkspacePresentation', () => {
  it('ADMIN opens planos with map and no selected plan', () => {
    const init = initialWorkspacePresentation(true, [plan('a')]);
    expect(init).toEqual({
      activeTab: 'planos',
      editorMode: 'operativo',
      showMap: true,
      selectedPlan: null,
      subscribeUserOrderAlerts: false,
    });
  });

  it('USER opens operativa on first plan and enables order alerts', () => {
    const plans = [plan('a'), plan('b')];
    const init = initialWorkspacePresentation(false, plans);
    expect(init.activeTab).toBe('operativo');
    expect(init.showMap).toBe(false);
    expect(init.selectedPlan).toBe(plans[0]);
    expect(init.subscribeUserOrderAlerts).toBe(true);
  });

  it('USER with empty plans selects null', () => {
    expect(initialWorkspacePresentation(false, []).selectedPlan).toBeNull();
  });
});
