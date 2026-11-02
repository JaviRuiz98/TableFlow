import { describe, expect, it, vi } from 'vitest';
import { ADMIN_NAV_ITEMS, prepareAdminNavClick } from './admin-shell-nav.util';

describe('admin-shell-nav.util', () => {
  it('lists the five admin sections', () => {
    expect(ADMIN_NAV_ITEMS.map((i) => i.path)).toEqual([
      '/admin/resumen',
      '/admin/actividad',
      '/admin/sala',
      '/admin/personal',
      '/admin/configuracion',
    ]);
  });

  it('prepareAdminNavClick stops the event from bubbling into the shell', () => {
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as Event;

    prepareAdminNavClick(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });
});
