import { apiClient } from '../../../shared/http/api-client';
import type {
  UpdateUsuarioRolesDto,
  UsuarioAdminDto,
  UsuarioListadoDto,
} from '../types/usuario.types';

const BASE = '/usuarios';
const opts = { auth: true };

export const usuariosService = {
  /** Listado básico — usado por selectores de otros módulos. */
  list: () => apiClient.get<UsuarioListadoDto[]>(BASE, opts),

  /** Listado administrativo (solo admin). Incluye correo, username y roles. */
  listForAdmin: () =>
    apiClient.get<UsuarioAdminDto[]>(`${BASE}/admin`, opts),

  /** Reemplaza los roles del usuario (solo admin). */
  updateRoles: (id: number, data: UpdateUsuarioRolesDto) =>
    apiClient.put<UpdateUsuarioRolesDto, UsuarioAdminDto>(
      `${BASE}/${id}/roles`,
      data,
      opts,
    ),
};
