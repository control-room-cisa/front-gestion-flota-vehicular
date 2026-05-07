import type { RolNombre } from '../../../shared/types/roles.types';

export interface LoginDto {
  codigo_empleado: string;
  contrasena: string;
}

export interface UsuarioEmpresaDto {
  id: number;
  codigo: string;
  nombre: string;
}

export interface UsuarioPublicoDto {
  id: number;
  codigo_empleado: string;
  nombre: string;
  apellido: string;
  roles: RolNombre[];
  empresa: UsuarioEmpresaDto | null;
}

export interface AuthResponseDto {
  token: string;
  usuario: UsuarioPublicoDto;
}
