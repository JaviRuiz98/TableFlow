import { NEW_OBSERVATION_ALERT, NEW_ORDER_ALERT } from './workspace-alerts.util';

describe('workspace-alerts.util', () => {
  it('keeps stable copy for new order and observation alerts', () => {
    expect(NEW_ORDER_ALERT.title).toBe('HAY NUEVOS PEDIDOS');
    expect(NEW_OBSERVATION_ALERT.eyebrow).toBe('OBSERVACIÓN');
    expect(NEW_OBSERVATION_ALERT.message).toContain('observación');
  });
});
