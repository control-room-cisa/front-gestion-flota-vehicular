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
