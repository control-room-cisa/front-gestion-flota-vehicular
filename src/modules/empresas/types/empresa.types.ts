/**
 * Tipos del módulo Empresas. Mantener idénticos a
 * back/src/modules/empresas/dtos/empresa.dtos.ts
 */

export interface EmpresaDto {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface CreateEmpresaDto {
  codigo: string;
  nombre: string;
}

export interface UpdateEmpresaDto {
  codigo?: string;
  nombre?: string;
  activo?: boolean;
}
