import type { RolNombre } from '../../../shared/types/roles.types';

/**
 * Tipos del módulo Auth — mantener idénticos a
 * back/src/modules/auth/dtos/auth.dtos.ts
 */

export interface LoginDto {
  codigo_empleado: string;
  contrasena: string;
}

export interface UsuarioPublicoDto {
  id: number;
  codigo_empleado: string;
  nombre: string;
  apellido: string;
  roles: RolNombre[];
}

export interface AuthResponseDto {
  token: string;
  usuario: UsuarioPublicoDto;
}
