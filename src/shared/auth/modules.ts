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
  /** Roles que pueden ver y entrar al módulo */
  allowed: RolNombre[];
}

export const APP_MODULES: AppModule[] = [
  { path: '/admin', label: 'Administración', allowed: ['admin'] },
  { path: '/empresas', label: 'Empresas', allowed: ['contabilidad', 'admin'] },
  { path: '/reportes', label: 'Reportes', allowed: ['contabilidad', 'admin'] },
  { path: '/vehiculos', label: 'Vehículos', allowed: ['logistica', 'admin'] },
  { path: '/monitoreo', label: 'Monitoreo', allowed: ['controlroom', 'admin'] },
  {
    path: '/movilizaciones',
    label: 'Movilizaciones',
    allowed: ['usuario', 'admin'],
  },
];

/**
 * Devuelve los módulos accesibles para un conjunto de roles.
 * Conserva el orden de `APP_MODULES`.
 */
export const getAccessibleModules = (roles: RolNombre[]): AppModule[] =>
  APP_MODULES.filter((m) => m.allowed.some((r) => roles.includes(r)));
