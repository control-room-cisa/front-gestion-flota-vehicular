import { apiClient } from '../../../shared/http/api-client';
import type { Paginated } from '../../../shared/types/api.types';
import type {
  CreateNivelTanqueDieselDto,
  NivelTanqueDieselDto,
  NivelTanqueDieselListQuery,
  UpdateNivelTanqueDieselDto,
} from '../types/nivel-tanque-diesel.types';

const BASE = '/niveles-tanque-diesel';
const opts = { auth: true };

const buildQueryString = (query: NivelTanqueDieselListQuery): string => {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.pageSize !== undefined) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const nivelTanqueDieselService = {
  list: (query: NivelTanqueDieselListQuery = {}) =>
    apiClient.get<Paginated<NivelTanqueDieselDto>>(
      `${BASE}${buildQueryString(query)}`,
      opts,
    ),

  getLatest: () =>
    apiClient.get<NivelTanqueDieselDto | null>(`${BASE}/ultimo`, opts),

  getById: (id: number) =>
    apiClient.get<NivelTanqueDieselDto>(`${BASE}/${id}`, opts),

  create: (data: CreateNivelTanqueDieselDto) =>
    apiClient.post<CreateNivelTanqueDieselDto, NivelTanqueDieselDto>(
      BASE,
      data,
      opts,
    ),

  update: (id: number, data: UpdateNivelTanqueDieselDto) =>
    apiClient.put<UpdateNivelTanqueDieselDto, NivelTanqueDieselDto>(
      `${BASE}/${id}`,
      data,
      opts,
    ),

  remove: (id: number) =>
    apiClient.delete<NivelTanqueDieselDto>(`${BASE}/${id}`, opts),
};
