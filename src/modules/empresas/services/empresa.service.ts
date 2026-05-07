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

  deactivate: (id: number) =>
    apiClient.delete<EmpresaDto>(`${BASE}/${id}`, opts),

  activate: (id: number) =>
    apiClient.post<undefined, EmpresaDto>(`${BASE}/${id}/activar`, undefined, opts),
};
