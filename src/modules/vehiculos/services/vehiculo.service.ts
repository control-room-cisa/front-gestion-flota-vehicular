import { apiClient } from '../../../shared/http/api-client';
import type {
  CreateVehiculoDto,
  UpdateVehiculoDto,
  VehiculoDto,
} from '../types/vehiculo.types';

const BASE = '/vehiculos';
const opts = { auth: true };

export const vehiculoService = {
  list: (incluirInactivos = false) =>
    apiClient.get<VehiculoDto[]>(
      `${BASE}${incluirInactivos ? '?incluirInactivos=true' : ''}`,
      opts,
    ),

  getById: (id: number) => apiClient.get<VehiculoDto>(`${BASE}/${id}`, opts),

  create: (data: CreateVehiculoDto) =>
    apiClient.post<CreateVehiculoDto, VehiculoDto>(BASE, data, opts),

  update: (id: number, data: UpdateVehiculoDto) =>
    apiClient.put<UpdateVehiculoDto, VehiculoDto>(`${BASE}/${id}`, data, opts),

  remove: (id: number) =>
    apiClient.delete<VehiculoDto>(`${BASE}/${id}`, opts),

  restore: (id: number) =>
    apiClient.post<undefined, VehiculoDto>(
      `${BASE}/${id}/restaurar`,
      undefined,
      opts,
    ),

  setActivo: (id: number, activo: boolean) =>
    apiClient.put<UpdateVehiculoDto, VehiculoDto>(
      `${BASE}/${id}`,
      { activo },
      opts,
    ),
};
