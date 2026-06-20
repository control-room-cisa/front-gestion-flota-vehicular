export interface NivelTanqueDieselDto {
  id: number;
  fecha: string;
  alturaPulgadas: string;
  volumenGalones: string;
  comentario: string | null;
  rellenoCombustible: boolean;
  galonesRellenados: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNivelTanqueDieselDto {
  fecha: string;
  alturaPulgadas: number;
  volumenGalones: number;
  comentario?: string | null;
  rellenoCombustible: boolean;
  galonesRellenados?: number | null;
}

export interface UpdateNivelTanqueDieselDto {
  fecha?: string;
  alturaPulgadas?: number;
  volumenGalones?: number;
  comentario?: string | null;
  rellenoCombustible?: boolean;
  galonesRellenados?: number | null;
}

export interface NivelTanqueDieselListQuery {
  page?: number;
  pageSize?: number;
}
