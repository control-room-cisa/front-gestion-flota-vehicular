/**
 * Tipos del módulo Construcción. Mantener idénticos a
 * back/src/modules/registros-construccion/dtos/registro-construccion.dtos.ts
 */

export interface RegistroConstruccionUsuarioDto {
  id: number;
  codigo_empleado: string;
  nombre: string;
  apellido: string;
}

export interface RegistroConstruccionEmpresaDto {
  id: number;
  codigo: string;
  nombre: string;
}

export interface RegistroConstruccionUnidadDto {
  id: number;
  nombre: string;
  clase: string;
}

export interface RegistroConstruccionDto {
  id: number;
  fecha: string;
  kilometrajeInicial: number | null;
  kilometrajeFinal: number | null;
  horaInicial: number | null;
  horaFinal: number | null;
  comentario: string;
  operadorId: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  operador: RegistroConstruccionUsuarioDto;
  unidad: RegistroConstruccionUnidadDto;
  empresas: RegistroConstruccionEmpresaDto[];
  canManage: boolean;
}

export interface CreateRegistroConstruccionDto {
  fecha: string;
  kilometrajeInicial?: number | null;
  kilometrajeFinal?: number | null;
  horaInicial?: number | null;
  horaFinal?: number | null;
  comentario: string;
  unidadId: number;
  empresaIds: number[];
  operadorId?: number;
}

export interface UpdateRegistroConstruccionDto {
  fecha?: string;
  kilometrajeInicial?: number | null;
  kilometrajeFinal?: number | null;
  horaInicial?: number | null;
  horaFinal?: number | null;
  comentario?: string;
  unidadId?: number;
  empresaIds?: number[];
  operadorId?: number;
}

export interface RegistroConstruccionListQuery {
  desde?: string;
  hasta?: string;
  unidadId?: number;
  operadorId?: number;
  page?: number;
  pageSize?: number;
}
