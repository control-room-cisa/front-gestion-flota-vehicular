import type { RolNombre } from '../types/roles.types';

/**
 * Catálogo de módulos principales de la aplicación.
 *
 * Es la fuente única de verdad para:
 *  - El menú de navegación (`NavMenu`).
 *  - Las redirecciones por rol (`role-routes.ts` lo consume).
 *  - Las protecciones de ruta (`<ProtectedRoute allowed={...} />` debe
 *    coincidir con `allowed` de cada entrada).
 */
export interface AppModule {
  path: string;
  label: string;
  /**
   * Roles que pueden ver y entrar al módulo.
   * Un array vacío significa "cualquier usuario autenticado".
   */
  allowed: RolNombre[];
}

export const APP_MODULES: AppModule[] = [
  // Movilizaciones está disponible para cualquier autenticado y se muestra
  // siempre en primer lugar del menú, sin importar el rol.
  { path: '/movilizaciones', label: 'Movilizaciones', allowed: [] },
  {
    path: '/dispensados',
    label: 'Dispensados',
    allowed: ['controlroom', 'logistica', 'almacen', 'admin'],
  },
  { path: '/admin', label: 'Administración', allowed: ['admin'] },
  { path: '/empresas', label: 'Empresas', allowed: ['contabilidad', 'admin'] },
  { path: '/reportes', label: 'Reportes', allowed: ['contabilidad', 'admin'] },
  { path: '/vehiculos', label: 'Vehículos', allowed: ['logistica', 'admin'] },
  { path: '/monitoreo', label: 'Monitoreo', allowed: ['controlroom', 'admin'] },
];

/**
 * Devuelve los módulos accesibles para un conjunto de roles.
 * Conserva el orden de `APP_MODULES`. Un módulo con `allowed: []`
 * se considera abierto a cualquier usuario autenticado.
 */
export const getAccessibleModules = (roles: RolNombre[]): AppModule[] =>
  APP_MODULES.filter(
    (m) => m.allowed.length === 0 || m.allowed.some((r) => roles.includes(r)),
  );
