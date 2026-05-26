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
   * Movilización inmediatamente anterior para el vehículo dado.
   * - `excludeId` se usa al editar, para no compararse contra el propio registro.
   * - `beforeFecha` (ISO) acota el lookup a la última con `fecha < beforeFecha`.
   *   Sin él, devuelve la última registrada en general.
   */
  lastByVehiculo: (
    vehiculoId: number,
    excludeId?: number,
    beforeFecha?: string,
  ) => {
    const params = new URLSearchParams();
    if (excludeId !== undefined) params.set('excludeId', String(excludeId));
    if (beforeFecha) params.set('beforeFecha', beforeFecha);
    const s = params.toString();
    const qs = s ? `?${s}` : '';
    return apiClient.get<UltimaMovilizacionVehiculoDto | null>(
      `${BASE}/last-by-vehiculo/${vehiculoId}${qs}`,
      opts,
    );
  },
};
