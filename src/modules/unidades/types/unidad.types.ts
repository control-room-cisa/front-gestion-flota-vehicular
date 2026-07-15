/**
 * Tipos del módulo Unidades. Mantener idénticos a
 * back/src/modules/unidades/dtos/unidad.dtos.ts
 */

export type TipoMedicion = 'KILOMETRAJE' | 'HOROMETRO' | 'HORAS_USO';

export type TipoCombustible = 'DIESEL' | 'GASOLINA';

export const TIPO_MEDICION_LABELS: Record<TipoMedicion, string> = {
  KILOMETRAJE: 'Kilometraje',
  HOROMETRO: 'Horómetro',
  HORAS_USO: 'Horas de uso',
};

export const TIPO_COMBUSTIBLE_LABELS: Record<TipoCombustible, string> = {
  DIESEL: 'Diesel',
  GASOLINA: 'Gasolina',
};

export interface UnidadCategoriaDto {
  id: number;
  nombre: string;
}

export interface UnidadDto {
  id: number;
  nombre: string;
  clase: string;
  activo: boolean;
  categoriaId: number;
  categoria: UnidadCategoriaDto;
  tipoMedicion: TipoMedicion;
  tipoCombustible: TipoCombustible;
  /**
   * Costo de mantenimiento por km. String para preservar 2 decimales.
   * `null` = sin valor definido.
   */
  costoMantenimiento: string | null;
}

export interface CreateUnidadDto {
  nombre: string;
  clase: string;
  categoriaId: number;
  tipoMedicion: TipoMedicion;
  tipoCombustible: TipoCombustible;
  costoMantenimiento?: number | null;
}

export interface UpdateUnidadDto {
  nombre?: string;
  clase?: string;
  activo?: boolean;
  categoriaId?: number;
  tipoMedicion?: TipoMedicion;
  tipoCombustible?: TipoCombustible;
  costoMantenimiento?: number | null;
}

/** Formatea costo / km para tabla (2 decimales). */
export const formatCostoMantenimiento = (
  value: string | null | undefined,
): string => {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
