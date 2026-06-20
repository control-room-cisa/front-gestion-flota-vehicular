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
