/**
 * Tipos del módulo Reportes. Mantener idénticos a
 * back/src/modules/reportes/dtos/reportes.dtos.ts
 */

export interface RendimientoCombustiblePunto {
  id: number;
  fecha: string;
  kilometraje: number;
  cantidadGalones: string;
  kmRecorridos: number | null;
  rendimiento: number | null;
}

export interface RendimientoCombustibleDto {
  unidadId: number;
  puntos: RendimientoCombustiblePunto[];
}

export interface KilometrosDiariosPunto {
  /** YYYY-MM-DD */
  fecha: string;
  km: number;
}

export interface KilometrosDiariosDto {
  unidadId: number;
  desde: string;
  hasta: string;
  puntos: KilometrosDiariosPunto[];
}

export interface KilometrajeActualUnidadDto {
  unidadId: number;
  nombre: string;
  clase: string;
  activo: boolean;
  kilometraje: number | null;
  fecha: string | null;
}

export interface KilometrajesActualesDto {
  unidades: KilometrajeActualUnidadDto[];
}

export interface UsoPorEmpresaLlenadoDto {
  id: number;
  fecha: string;
  kilometraje: number;
  cantidadGalones: string;
  precioGalon: string;
  costo: number;
}

export interface UsoPorEmpresaEmpresaDto {
  id: number;
  codigo: string;
  nombre: string;
  kmAsignados: number | null;
}

export interface UsoPorEmpresaItemDto {
  id: number;
  fecha: string;
  kilometrajeInicial: number;
  kilometrajeFinal: number;
  recorrido: number;
  esViaje: boolean;
  comentario: string;
  usuario: {
    id: number;
    codigo_empleado: string;
    nombre: string;
    apellido: string;
  };
  unidad: {
    id: number;
    nombre: string;
    clase: string;
    costoMantenimiento: string | null;
  };
  empresas: UsoPorEmpresaEmpresaDto[];
  combustiblePorKm: number | null;
  mantenimientoPorKm: number;
  costoPorKm: number | null;
  costoMovilizacionTotal: number | null;
  llenadoSuperior: UsoPorEmpresaLlenadoDto | null;
  llenadoInferior: UsoPorEmpresaLlenadoDto | null;
  kmEntreLlenados: number | null;
  /** Mensaje si faltó precio de catálogo para el llenado superior interno. */
  errorCosto: string | null;
}

export interface UsoPorEmpresaErrorDto {
  movilizacionId: number;
  dispensadoId: number;
  fechaDispensado: string;
  unidadId: number;
  unidadNombre: string;
  tipoCombustible: string;
  message: string;
}

export interface UsoPorEmpresaDto {
  desde: string;
  hasta: string;
  items: UsoPorEmpresaItemDto[];
  errores: UsoPorEmpresaErrorDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UsoPorEmpresaQuery {
  desde?: string;
  hasta?: string;
  unidadId?: number;
  empresaId?: number;
  page?: number;
  pageSize?: number;
}
