import { apiClient } from '../../../shared/http/api-client';
import type {
  KilometrajesActualesDto,
  KilometrosDiariosDto,
  RendimientoCombustibleDto,
  UsoPorEmpresaDto,
  UsoPorEmpresaQuery,
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

  usoPorEmpresa: (params: UsoPorEmpresaQuery = {}) => {
    const qs = new URLSearchParams();
    if (params.desde) qs.set('desde', params.desde);
    if (params.hasta) qs.set('hasta', params.hasta);
    if (params.unidadId !== undefined)
      qs.set('unidadId', String(params.unidadId));
    if (params.empresaId !== undefined)
      qs.set('empresaId', String(params.empresaId));
    if (params.page !== undefined) qs.set('page', String(params.page));
    if (params.pageSize !== undefined)
      qs.set('pageSize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.get<UsoPorEmpresaDto>(
      `${BASE}/uso-por-empresa${s ? `?${s}` : ''}`,
      opts,
    );
  },
};
