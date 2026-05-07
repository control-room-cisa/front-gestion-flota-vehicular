import { apiClient } from '../../../shared/http/api-client';
import type { UsuarioListadoDto } from '../types/usuario.types';

const BASE = '/usuarios';
const opts = { auth: true };

export const usuariosService = {
  list: () => apiClient.get<UsuarioListadoDto[]>(BASE, opts),
};
