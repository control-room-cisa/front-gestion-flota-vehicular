import { apiClient } from '../../../shared/http/api-client';
import type {
  CreateEmpresaDto,
  EmpresaDto,
  UpdateEmpresaDto,
} from '../types/empresa.types';

const BASE = '/empresas';
const opts = { auth: true };

export const empresaService = {
  list: (incluirInactivas = false) =>
    apiClient.get<EmpresaDto[]>(
      `${BASE}${incluirInactivas ? '?incluirInactivas=true' : ''}`,
      opts,
    ),

  getById: (id: number) => apiClient.get<EmpresaDto>(`${BASE}/${id}`, opts),

  create: (data: CreateEmpresaDto) =>
    apiClient.post<CreateEmpresaDto, EmpresaDto>(BASE, data, opts),

  update: (id: number, data: UpdateEmpresaDto) =>
    apiClient.put<UpdateEmpresaDto, EmpresaDto>(`${BASE}/${id}`, data, opts),

  remove: (id: number) =>
    apiClient.delete<EmpresaDto>(`${BASE}/${id}`, opts),

  restore: (id: number) =>
    apiClient.post<undefined, EmpresaDto>(
      `${BASE}/${id}/restaurar`,
      undefined,
      opts,
    ),

  setActivo: (id: number, activo: boolean) =>
    apiClient.put<UpdateEmpresaDto, EmpresaDto>(
      `${BASE}/${id}`,
      { activo },
      opts,
    ),
};
