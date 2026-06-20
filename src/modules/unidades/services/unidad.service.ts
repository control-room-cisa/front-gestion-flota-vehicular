import { apiClient } from '../../../shared/http/api-client';
import type {
  CreateUnidadDto,
  UpdateUnidadDto,
  UnidadDto,
} from '../types/unidad.types';

const BASE = '/unidades';
const opts = { auth: true };

export const unidadService = {
  list: (params: {
    incluirInactivos?: boolean;
    categoriaId?: number;
    categoriaCodigo?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.incluirInactivos) qs.set('incluirInactivos', 'true');
    if (params.categoriaId !== undefined) {
      qs.set('categoriaId', String(params.categoriaId));
    }
    if (params.categoriaCodigo) {
      qs.set('categoriaCodigo', params.categoriaCodigo);
    }
    const s = qs.toString();
    return apiClient.get<UnidadDto[]>(`${BASE}${s ? `?${s}` : ''}`, opts);
  },

  getById: (id: number) => apiClient.get<UnidadDto>(`${BASE}/${id}`, opts),

  create: (data: CreateUnidadDto) =>
    apiClient.post<CreateUnidadDto, UnidadDto>(BASE, data, opts),

  update: (id: number, data: UpdateUnidadDto) =>
    apiClient.put<UpdateUnidadDto, UnidadDto>(`${BASE}/${id}`, data, opts),

  remove: (id: number) =>
    apiClient.delete<UnidadDto>(`${BASE}/${id}`, opts),

  restore: (id: number) =>
    apiClient.post<undefined, UnidadDto>(
      `${BASE}/${id}/restaurar`,
      undefined,
      opts,
    ),

  setActivo: (id: number, activo: boolean) =>
    apiClient.put<UpdateUnidadDto, UnidadDto>(
      `${BASE}/${id}`,
      { activo },
      opts,
    ),
};
