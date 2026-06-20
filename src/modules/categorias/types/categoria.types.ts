/**
 * Tipos del módulo Categorías. Mantener idénticos a
 * back/src/modules/categorias/dtos/categoria.dtos.ts
 */

export interface CategoriaDto {
  id: number;
  nombre: string;
  codigo: string | null;
  editable: boolean;
  activo: boolean;
}

export interface CreateCategoriaDto {
  nombre: string;
}

export interface UpdateCategoriaDto {
  nombre?: string;
  activo?: boolean;
}

/** Código de la categoría de sistema para vehículos livianos. */
export const CATEGORIA_CODIGO_VEHICULOS_LIVIANOS = 'VEHICULOS_LIVIANOS';

export const findCategoriaVehiculosLivianos = (
  categorias: CategoriaDto[],
): CategoriaDto | undefined =>
  categorias.find((c) => c.codigo === CATEGORIA_CODIGO_VEHICULOS_LIVIANOS);
