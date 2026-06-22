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
}

export interface CreateUnidadDto {
  nombre: string;
  clase: string;
  categoriaId: number;
  tipoMedicion: TipoMedicion;
  tipoCombustible: TipoCombustible;
}

export interface UpdateUnidadDto {
  nombre?: string;
  clase?: string;
  activo?: boolean;
  categoriaId?: number;
  tipoMedicion?: TipoMedicion;
  tipoCombustible?: TipoCombustible;
}
