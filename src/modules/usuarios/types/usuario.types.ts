/**
 * Tipos del módulo Usuarios. Mantener idénticos a
 * back/src/modules/usuarios/dtos/usuario.dtos.ts
 */

import type { UsuarioEmpresaDto } from '../../auth/types/auth.types';

export interface UsuarioListadoDto {
  id: number;
  codigo_empleado: string;
  nombre: string;
  apellido: string;
  empresa: UsuarioEmpresaDto | null;
}
