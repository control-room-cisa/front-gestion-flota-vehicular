import { apiClient } from '../../../shared/http/api-client';
import type { Paginated } from '../../../shared/types/api.types';
import type {
  CreateRegistroConstruccionDto,
  RegistroConstruccionDto,
  RegistroConstruccionListQuery,
  UpdateRegistroConstruccionDto,
} from '../types/registro-construccion.types';

const BASE = '/registros-construccion';
const opts = { auth: true };

const buildQueryString = (query: RegistroConstruccionListQuery): string => {
  const params = new URLSearchParams();
  if (query.desde) params.set('desde', query.desde);
  if (query.hasta) params.set('hasta', query.hasta);
  if (query.unidadId !== undefined)
    params.set('unidadId', String(query.unidadId));
  if (query.operadorId !== undefined)
    params.set('operadorId', String(query.operadorId));
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.pageSize !== undefined)
    params.set('pageSize', String(query.pageSize));
  const s = params.toString();
  return s ? `?${s}` : '';
};

export const registroConstruccionService = {
  list: (query: RegistroConstruccionListQuery = {}) =>
    apiClient.get<Paginated<RegistroConstruccionDto>>(
      `${BASE}${buildQueryString(query)}`,
      opts,
    ),

  getById: (id: number) =>
    apiClient.get<RegistroConstruccionDto>(`${BASE}/${id}`, opts),

  create: (data: CreateRegistroConstruccionDto) =>
    apiClient.post<CreateRegistroConstruccionDto, RegistroConstruccionDto>(
      BASE,
      data,
      opts,
    ),

  update: (id: number, data: UpdateRegistroConstruccionDto) =>
    apiClient.put<UpdateRegistroConstruccionDto, RegistroConstruccionDto>(
      `${BASE}/${id}`,
      data,
      opts,
    ),

  remove: (id: number) =>
    apiClient.delete<RegistroConstruccionDto>(`${BASE}/${id}`, opts),
};
