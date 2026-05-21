/**
 * Tipos del módulo Usuarios. Mantener idénticos a
 * back/src/modules/usuarios/dtos/usuario.dtos.ts
 */

import type { UsuarioEmpresaDto } from '../../auth/types/auth.types';
import type { RolNombre } from '../../../shared/types/roles.types';

export interface UsuarioListadoDto {
  id: number;
  codigo_empleado: string;
  nombre: string;
  apellido: string;
  empresa: UsuarioEmpresaDto | null;
}

export interface UsuarioAdminDto extends UsuarioListadoDto {
  correo_electronico: string | null;
  nombre_usuario: string | null;
  roles: RolNombre[];
}

export interface UpdateUsuarioRolesDto {
  roles: RolNombre[];
}

export interface UsuarioSyncItemDto {
  codigo_empleado: string;
  nombre: string;
  apellido: string;
  contrasena: string;
  codigo_empresa: string | null;
  correo_electronico: string | null;
  nombre_usuario: string | null;
}

export interface SyncUsuariosDto {
  usuarios: UsuarioSyncItemDto[];
}

export type UsuarioSyncAccion = 'creado' | 'actualizado';

export interface UsuarioSyncResultadoDto {
  codigo_empleado: string;
  accion: UsuarioSyncAccion;
  id: number;
}

export interface UsuarioSyncErrorDto {
  codigo_empleado: string;
  mensaje: string;
}

export interface UsuarioSyncResponseDto {
  total: number;
  creados: number;
  actualizados: number;
  resultados: UsuarioSyncResultadoDto[];
  errores: UsuarioSyncErrorDto[];
}
