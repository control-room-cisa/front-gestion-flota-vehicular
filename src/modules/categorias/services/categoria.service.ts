import { apiClient } from '../../../shared/http/api-client';
import type {
  CategoriaDto,
  CreateCategoriaDto,
  UpdateCategoriaDto,
} from '../types/categoria.types';

const BASE = '/categorias';
const opts = { auth: true };

export const categoriaService = {
  list: (incluirInactivas = false) =>
    apiClient.get<CategoriaDto[]>(
      `${BASE}${incluirInactivas ? '?incluirInactivas=true' : ''}`,
      opts,
    ),

  getById: (id: number) => apiClient.get<CategoriaDto>(`${BASE}/${id}`, opts),

  create: (data: CreateCategoriaDto) =>
    apiClient.post<CreateCategoriaDto, CategoriaDto>(BASE, data, opts),

  update: (id: number, data: UpdateCategoriaDto) =>
    apiClient.put<UpdateCategoriaDto, CategoriaDto>(`${BASE}/${id}`, data, opts),

  remove: (id: number) =>
    apiClient.delete<CategoriaDto>(`${BASE}/${id}`, opts),

  restore: (id: number) =>
    apiClient.post<undefined, CategoriaDto>(
      `${BASE}/${id}/restaurar`,
      undefined,
      opts,
    ),

  setActivo: (id: number, activo: boolean) =>
    apiClient.put<UpdateCategoriaDto, CategoriaDto>(
      `${BASE}/${id}`,
      { activo },
      opts,
    ),
};
