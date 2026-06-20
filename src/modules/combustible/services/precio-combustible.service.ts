import { apiClient } from '../../../shared/http/api-client';
import type { Paginated } from '../../../shared/types/api.types';
import type {
  CreatePrecioCombustibleDto,
  PrecioCombustibleDto,
  PrecioCombustibleListQuery,
  TipoCombustiblePrecio,
  UpdatePrecioCombustibleDto,
} from '../types/precio-combustible.types';

const BASE = '/precios-combustible';
const opts = { auth: true };

const buildQueryString = (query: PrecioCombustibleListQuery): string => {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.pageSize !== undefined) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const precioCombustibleService = {
  list: (query: PrecioCombustibleListQuery = {}) =>
    apiClient.get<Paginated<PrecioCombustibleDto>>(
      `${BASE}${buildQueryString(query)}`,
      opts,
    ),

  getById: (id: number) =>
    apiClient.get<PrecioCombustibleDto>(`${BASE}/${id}`, opts),

  getVigente: (fecha: string, tipoCombustible: TipoCombustiblePrecio) => {
    const params = new URLSearchParams({ fecha, tipoCombustible });
    return apiClient.get<PrecioCombustibleDto>(`${BASE}/vigente?${params}`, opts);
  },

  create: (data: CreatePrecioCombustibleDto) =>
    apiClient.post<CreatePrecioCombustibleDto, PrecioCombustibleDto>(
      BASE,
      data,
      opts,
    ),

  update: (id: number, data: UpdatePrecioCombustibleDto) =>
    apiClient.put<UpdatePrecioCombustibleDto, PrecioCombustibleDto>(
      `${BASE}/${id}`,
      data,
      opts,
    ),

  remove: (id: number) =>
    apiClient.delete<PrecioCombustibleDto>(`${BASE}/${id}`, opts),
};
