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
