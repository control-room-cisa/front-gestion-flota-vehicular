import { apiClient } from '../../../shared/http/api-client';
import type { Paginated } from '../../../shared/types/api.types';
import type {
  CreateDispensadoDto,
  DispensadoDto,
  DispensadoListQuery,
  UpdateDispensadoDto,
} from '../types/dispensado.types';

const BASE = '/dispensados';
const opts = { auth: true };

const buildQueryString = (query: DispensadoListQuery): string => {
  const params = new URLSearchParams();
  if (query.desde) params.set('desde', query.desde);
  if (query.hasta) params.set('hasta', query.hasta);
  if (query.vehiculoId !== undefined)
    params.set('vehiculoId', String(query.vehiculoId));
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.pageSize !== undefined)
    params.set('pageSize', String(query.pageSize));
  const s = params.toString();
  return s ? `?${s}` : '';
};

export const dispensadoService = {
  list: (query: DispensadoListQuery = {}) =>
    apiClient.get<Paginated<DispensadoDto>>(
      `${BASE}${buildQueryString(query)}`,
      opts,
    ),

  getById: (id: number) =>
    apiClient.get<DispensadoDto>(`${BASE}/${id}`, opts),

  create: (data: CreateDispensadoDto) =>
    apiClient.post<CreateDispensadoDto, DispensadoDto>(BASE, data, opts),

  update: (id: number, data: UpdateDispensadoDto) =>
    apiClient.put<UpdateDispensadoDto, DispensadoDto>(
      `${BASE}/${id}`,
      data,
      opts,
    ),

  remove: (id: number) =>
    apiClient.delete<DispensadoDto>(`${BASE}/${id}`, opts),
};
