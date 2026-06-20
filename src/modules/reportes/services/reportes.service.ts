import { apiClient } from '../../../shared/http/api-client';
import type {
  KilometrajesActualesDto,
  KilometrosDiariosDto,
  RendimientoCombustibleDto,
} from '../types/reportes.types';

const BASE = '/reportes';
const opts = { auth: true };

export const reportesService = {
  rendimientoCombustible: (unidadId: number) =>
    apiClient.get<RendimientoCombustibleDto>(
      `${BASE}/rendimiento-combustible?unidadId=${unidadId}`,
      opts,
    ),

  kilometrosDiarios: (params: {
    unidadId: number;
    desde?: string;
    hasta?: string;
  }) => {
    const qs = new URLSearchParams();
    qs.set('unidadId', String(params.unidadId));
    if (params.desde) qs.set('desde', params.desde);
    if (params.hasta) qs.set('hasta', params.hasta);
    return apiClient.get<KilometrosDiariosDto>(
      `${BASE}/kilometros-diarios?${qs.toString()}`,
      opts,
    );
  },

  kilometrajesActuales: () =>
    apiClient.get<KilometrajesActualesDto>(`${BASE}/kilometrajes-actuales`, opts),
};
