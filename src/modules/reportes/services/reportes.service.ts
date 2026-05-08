import { apiClient } from '../../../shared/http/api-client';
import type {
  KilometrosDiariosDto,
  RendimientoCombustibleDto,
} from '../types/reportes.types';

const BASE = '/reportes';
const opts = { auth: true };

export const reportesService = {
  rendimientoCombustible: (vehiculoId: number) =>
    apiClient.get<RendimientoCombustibleDto>(
      `${BASE}/rendimiento-combustible?vehiculoId=${vehiculoId}`,
      opts,
    ),

  kilometrosDiarios: (params: {
    vehiculoId: number;
    desde?: string;
    hasta?: string;
  }) => {
    const qs = new URLSearchParams();
    qs.set('vehiculoId', String(params.vehiculoId));
    if (params.desde) qs.set('desde', params.desde);
    if (params.hasta) qs.set('hasta', params.hasta);
    return apiClient.get<KilometrosDiariosDto>(
      `${BASE}/kilometros-diarios?${qs.toString()}`,
      opts,
    );
  },
};
