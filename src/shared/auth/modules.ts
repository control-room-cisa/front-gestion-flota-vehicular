import {
  COMBUSTIBLE_ACCESS_ROLES,
  CONFIGURACIONES_ACCESS_ROLES,
  CONSTRUCCION_ACCESS_ROLES,
  REPORTES_ACCESS_ROLES,
  type RolNombre,
} from '../types/roles.types';

/**
 * Catálogo de módulos principales de la aplicación.
 *
 * Es la fuente única de verdad para:
 *  - El menú de navegación (`NavMenu`).
 *  - La ruta de entrada tras login (`getHomeRoute` en `role-routes.ts`).
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
    path: '/uso-maquinaria',
    label: 'Uso maquinaria',
    allowed: CONSTRUCCION_ACCESS_ROLES,
  },
  {
    path: '/dispensados',
    label: 'Dispensados',
    allowed: ['controlroom', 'logistica', 'almacen', 'admin'],
  },
  {
    path: '/combustible',
    label: 'Combustible',
    allowed: COMBUSTIBLE_ACCESS_ROLES,
  },
  {
    path: '/configuraciones',
    label: 'Configuraciones',
    allowed: CONFIGURACIONES_ACCESS_ROLES,
  },
  { path: '/usuarios', label: 'Usuarios', allowed: ['admin'] },
  { path: '/empresas', label: 'Empresas', allowed: ['contabilidad', 'admin'] },
  {
    path: '/reportes',
    label: 'Reportes',
    allowed: REPORTES_ACCESS_ROLES,
  },
  { path: '/unidades', label: 'Unidades', allowed: ['logistica', 'admin'] },
  { path: '/categorias', label: 'Categorías', allowed: ['logistica', 'admin'] },
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
