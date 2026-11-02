export type AdminNavItem = {
  path: string;
  desktopLabel: string;
  mobileLabel: string;
  exact?: boolean;
};

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { path: '/admin/resumen', desktopLabel: 'Resumen', mobileLabel: 'Resumen', exact: true },
  { path: '/admin/actividad', desktopLabel: 'Actividad', mobileLabel: 'Actividad' },
  { path: '/admin/sala', desktopLabel: 'Gestión de sala', mobileLabel: 'Sala' },
  { path: '/admin/personal', desktopLabel: 'Personal', mobileLabel: 'Personal' },
  { path: '/admin/configuracion', desktopLabel: 'Configuración', mobileLabel: 'Config' },
];

/** Shared click handling for desktop + mobile admin section links. */
export function prepareAdminNavClick(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
}
