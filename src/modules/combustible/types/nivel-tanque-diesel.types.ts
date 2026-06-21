export interface NivelTanqueDieselDto {
  id: number;
  fecha: string;
  alturaCm: string;
  volumenGalones: string;
  comentario: string | null;
  rellenoCombustible: boolean;
  galonesRellenados: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNivelTanqueDieselDto {
  fecha: string;
  alturaCm: number;
  volumenGalones: number;
  comentario?: string | null;
  rellenoCombustible: boolean;
  galonesRellenados?: number | null;
}

export interface UpdateNivelTanqueDieselDto {
  fecha?: string;
  alturaCm?: number;
  volumenGalones?: number;
  comentario?: string | null;
  rellenoCombustible?: boolean;
  galonesRellenados?: number | null;
}

export interface NivelTanqueDieselListQuery {
  page?: number;
  pageSize?: number;
}
