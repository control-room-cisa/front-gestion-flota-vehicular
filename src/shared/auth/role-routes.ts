import type { RolNombre } from '../types/roles.types';
import { getAccessibleModules } from './modules';

export const LOGIN_ROUTE = '/login';

/**
 * Ruta de entrada tras login o cuando no tiene permiso en una ruta:
 * primer módulo del menú (izquierda → derecha) al que el usuario tiene acceso.
 */
export const getHomeRoute = (roles: RolNombre[]): string => {
  const first = getAccessibleModules(roles)[0];
  return first?.path ?? LOGIN_ROUTE;
};
