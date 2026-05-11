import type { RolNombre } from '../../../shared/types/roles.types';

/**
 * Credenciales de inicio de sesión.
 *
 * `identificador` acepta cualquiera de los tres campos únicos del usuario:
 *  - `codigo_empleado`
 *  - `correo_electronico`
 *  - `nombre_usuario`
 */
export interface LoginDto {
  identificador: string;
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
  correo_electronico: string | null;
  nombre_usuario: string | null;
  roles: RolNombre[];
  empresa: UsuarioEmpresaDto | null;
}

export interface AuthResponseDto {
  token: string;
  usuario: UsuarioPublicoDto;
}
