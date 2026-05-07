import type { RolNombre } from '../types/roles.types';

/**
 * Ruta "home" para cada rol — primer componente disponible
 * cuando un usuario con ese rol entra al sistema.
 */
export const ROLE_HOME: Record<RolNombre, string> = {
  admin: '/admin',
  contabilidad: '/empresas',
  logistica: '/vehiculos',
  controlroom: '/monitoreo',
  almacen: '/dispensados',
  usuario: '/movilizaciones',
};

/**
 * Prioridad cuando un usuario tiene múltiples roles:
 * el primero que aparezca en este array es el "rol primario"
 * y define a dónde se le redirige tras el login.
 */
const PRIORIDAD_ROLES: RolNombre[] = [
  'admin',
  'contabilidad',
  'logistica',
  'controlroom',
  'almacen',
  'usuario',
];

export const getPrimaryRole = (roles: RolNombre[]): RolNombre | undefined =>
  PRIORIDAD_ROLES.find((r) => roles.includes(r));

export const getHomeRoute = (roles: RolNombre[]): string => {
  const principal = getPrimaryRole(roles);
  return principal ? ROLE_HOME[principal] : '/login';
};

export const LOGIN_ROUTE = '/login';
