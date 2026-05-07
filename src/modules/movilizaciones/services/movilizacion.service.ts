import { apiClient } from '../../../shared/http/api-client';
import type { Paginated } from '../../../shared/types/api.types';
import type {
  CreateMovilizacionDto,
  MovilizacionDto,
  MovilizacionListQuery,
  UltimaMovilizacionVehiculoDto,
  UpdateMovilizacionDto,
} from '../types/movilizacion.types';

const BASE = '/movilizaciones';
const opts = { auth: true };

const buildQueryString = (query: MovilizacionListQuery): string => {
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

export const movilizacionService = {
  list: (query: MovilizacionListQuery = {}) =>
    apiClient.get<Paginated<MovilizacionDto>>(
      `${BASE}${buildQueryString(query)}`,
      opts,
    ),

  getById: (id: number) =>
    apiClient.get<MovilizacionDto>(`${BASE}/${id}`, opts),

  create: (data: CreateMovilizacionDto) =>
    apiClient.post<CreateMovilizacionDto, MovilizacionDto>(BASE, data, opts),

  update: (id: number, data: UpdateMovilizacionDto) =>
    apiClient.put<UpdateMovilizacionDto, MovilizacionDto>(
      `${BASE}/${id}`,
      data,
      opts,
    ),

  remove: (id: number) =>
    apiClient.delete<MovilizacionDto>(`${BASE}/${id}`, opts),

  /**
   * Última movilización registrada para el vehículo dado. `excludeId` se
   * usa al editar, para no compararse contra el propio registro.
   */
  lastByVehiculo: (vehiculoId: number, excludeId?: number) => {
    const qs = excludeId ? `?excludeId=${excludeId}` : '';
    return apiClient.get<UltimaMovilizacionVehiculoDto | null>(
      `${BASE}/last-by-vehiculo/${vehiculoId}${qs}`,
      opts,
    );
  },
};
