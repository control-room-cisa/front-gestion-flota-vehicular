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
  vehiculoId: number;
  puntos: RendimientoCombustiblePunto[];
}

export interface KilometrosDiariosPunto {
  /** YYYY-MM-DD */
  fecha: string;
  km: number;
}

export interface KilometrosDiariosDto {
  vehiculoId: number;
  desde: string;
  hasta: string;
  puntos: KilometrosDiariosPunto[];
}
