/**
 * Catálogo cerrado de roles del sistema.
 * Cada rol desbloquea funcionalidades específicas.
 *
 * Para añadir un rol nuevo:
 *   1) Agregar el identificador a `ROLES`.
 *   2) Insertar el registro correspondiente en la tabla `roles` (seed).
 *   3) Replicar el cambio en `back/src/shared/types/roles.types.ts`.
 *
 * Mantener este archivo idéntico entre backend y frontend.
 */

export const ROLES = [
  'usuario',
  'controlroom',
  'logistica',
  'contabilidad',
  'almacen',
  'mecanica',
  'construccion',
  'admin',
] as const;

export type RolNombre = (typeof ROLES)[number];

/** Registro persistido en la tabla `roles`. */
export interface Rol {
  id: number;
  nombre: RolNombre;
}

/**
 * Indica si un usuario tiene al menos uno de los roles requeridos.
 * - `userRoles` puede venir undefined/empty (usuario sin roles → siempre false).
 * - `required` puede ser un único rol o un arreglo (OR lógico).
 */
export const hasRole = (
  userRoles: RolNombre[] | undefined,
  required: RolNombre | RolNombre[],
): boolean => {
  if (!userRoles || userRoles.length === 0) return false;
  const requeridos = Array.isArray(required) ? required : [required];
  return requeridos.some((r) => userRoles.includes(r));
};

/**
 * Roles con privilegios elevados sobre el módulo de movilizaciones:
 *  - Pueden editar / eliminar movilizaciones de cualquier usuario.
 *  - Pueden seleccionar múltiples empresas al registrar.
 *
 * Los demás usuarios sólo pueden gestionar sus propios registros y
 * el sistema fija automáticamente la empresa a la que pertenecen.
 */
export const MOVILIZACION_MANAGER_ROLES: RolNombre[] = [
  'controlroom',
  'logistica',
  'admin',
];

export const isMovilizacionManager = (
  userRoles: RolNombre[] | undefined,
): boolean => hasRole(userRoles, MOVILIZACION_MANAGER_ROLES);

/**
 * Roles autorizados para exportar / descargar el reporte
 * de movilizaciones (Excel y derivados). Incluye contabilidad,
 * que solo requiere visibilidad para reportería pero no necesita
 * permisos de edición sobre los registros.
 */
export const MOVILIZACION_EXPORT_ROLES: RolNombre[] = [
  'admin',
  'controlroom',
  'contabilidad',
  'logistica',
];

export const canExportMovilizaciones = (
  userRoles: RolNombre[] | undefined,
): boolean => hasRole(userRoles, MOVILIZACION_EXPORT_ROLES);

/**
 * Roles con acceso al módulo de dispensados de combustible.
 * Cualquiera de estos roles puede ver, crear, editar y eliminar
 * registros de dispensado (ownership-based: el dueño y los demás
 * roles operativos pueden gestionarlos).
 */
export const DISPENSADO_MANAGER_ROLES: RolNombre[] = [
  'controlroom',
  'logistica',
  'almacen',
  'admin',
];

export const isDispensadoManager = (
  userRoles: RolNombre[] | undefined,
): boolean => hasRole(userRoles, DISPENSADO_MANAGER_ROLES);

/**
 * Roles que pueden editar manualmente el precio por galón en dispensados.
 * El resto usa el valor de configuración (alta) o conserva el guardado (edición).
 */
export const DISPENSADO_PRECIO_EDIT_ROLES: RolNombre[] = [
  'contabilidad',
  'logistica',
  'admin',
];

export const canEditDispensadoPrecio = (
  userRoles: RolNombre[] | undefined,
): boolean => hasRole(userRoles, DISPENSADO_PRECIO_EDIT_ROLES);

/** Acceso al módulo de configuraciones del sistema. */
export const CONFIGURACIONES_ACCESS_ROLES: RolNombre[] = ['admin'];

export const canAccessConfiguraciones = (
  userRoles: RolNombre[] | undefined,
): boolean => hasRole(userRoles, CONFIGURACIONES_ACCESS_ROLES);

/** Pestaña Niveles del módulo Combustible (tanque diesel). */
export const COMBUSTIBLE_NIVELES_ACCESS_ROLES: RolNombre[] = [
  'contabilidad',
  'almacen',
  'controlroom',
  'logistica',
  'admin',
];

export const canAccessCombustibleNiveles = (
  userRoles: RolNombre[] | undefined,
): boolean => hasRole(userRoles, COMBUSTIBLE_NIVELES_ACCESS_ROLES);

/** Pestaña Precios del módulo Combustible. */
export const COMBUSTIBLE_PRECIOS_ACCESS_ROLES: RolNombre[] = [
  'admin',
  'logistica',
  'contabilidad',
];

export const canAccessCombustiblePrecios = (
  userRoles: RolNombre[] | undefined,
): boolean => hasRole(userRoles, COMBUSTIBLE_PRECIOS_ACCESS_ROLES);

/**
 * Acceso al módulo Combustible (al menos una pestaña).
 * Unión de roles de Niveles y Precios.
 */
export const COMBUSTIBLE_ACCESS_ROLES: RolNombre[] = [
  'contabilidad',
  'almacen',
  'controlroom',
  'logistica',
  'admin',
];

export const canAccessCombustible = (
  userRoles: RolNombre[] | undefined,
): boolean => hasRole(userRoles, COMBUSTIBLE_ACCESS_ROLES);

/**
 * Acceso al módulo de registros de construcción (uso de unidades en obra).
 */
export const CONSTRUCCION_ACCESS_ROLES: RolNombre[] = [
  'admin',
  'logistica',
  'construccion',
];

export const canAccessConstruccion = (
  userRoles: RolNombre[] | undefined,
): boolean => hasRole(userRoles, CONSTRUCCION_ACCESS_ROLES);

/**
 * Roles con privilegios elevados sobre registros de construcción.
 */
export const CONSTRUCCION_MANAGER_ROLES: RolNombre[] = ['admin', 'logistica'];

export const isConstruccionManager = (
  userRoles: RolNombre[] | undefined,
): boolean => hasRole(userRoles, CONSTRUCCION_MANAGER_ROLES);

/**
 * Roles con acceso al módulo de reportes operativos
 * (rendimiento de combustible, kilómetros diarios, etc.).
 */
export const REPORTES_ACCESS_ROLES: RolNombre[] = [
  'logistica',
  'contabilidad',
  'mecanica',
  'admin',
];
