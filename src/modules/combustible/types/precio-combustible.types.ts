export type TipoCombustiblePrecio = 'DIESEL' | 'GASOLINA';

export const TIPO_COMBUSTIBLE_PRECIO_LABELS: Record<TipoCombustiblePrecio, string> = {
  DIESEL: 'Diesel',
  GASOLINA: 'Gasolina',
};

export interface PrecioCombustibleDto {
  id: number;
  fechaInicio: string;
  fechaFin: string;
  precioGalon: string;
  tipoCombustible: TipoCombustiblePrecio;
  comentario: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrecioCombustibleDto {
  fechaInicio: string;
  fechaFin: string;
  precioGalon: number;
  tipoCombustible: TipoCombustiblePrecio;
  comentario?: string | null;
}

export interface UpdatePrecioCombustibleDto {
  fechaInicio?: string;
  fechaFin?: string;
  precioGalon?: number;
  tipoCombustible?: TipoCombustiblePrecio;
  comentario?: string | null;
}

export interface PrecioCombustibleListQuery {
  page?: number;
  pageSize?: number;
}
