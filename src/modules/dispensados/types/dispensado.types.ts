/**
 * Tipos del módulo Dispensados de combustible. Mantener idénticos a
 * back/src/modules/dispensados/dtos/dispensado.dtos.ts
 */

export interface DispensadoUsuarioDto {
  id: number;
  codigo_empleado: string;
  nombre: string;
  apellido: string;
}

export interface DispensadoVehiculoDto {
  id: number;
  nombre: string;
  clase: string;
}

export interface DispensadoDto {
  id: number;
  fecha: string;
  /** Kilometraje único registrado al momento del dispensado. */
  kilometraje: number;
  /** Decimal serializado a string desde el backend para preservar precisión. */
  cantidadGalones: string;
  precioGalon: string;
  observaciones: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  usuario: DispensadoUsuarioDto;
  vehiculo: DispensadoVehiculoDto;
  canManage: boolean;
}

export interface CreateDispensadoDto {
  fecha: string;
  kilometraje: number;
  cantidadGalones: number;
  precioGalon: number;
  vehiculoId: number;
  observaciones?: string | null;
}

export interface UpdateDispensadoDto {
  fecha?: string;
  kilometraje?: number;
  cantidadGalones?: number;
  precioGalon?: number;
  vehiculoId?: number;
  observaciones?: string | null;
}

export interface DispensadoListQuery {
  desde?: string;
  hasta?: string;
  vehiculoId?: number;
  page?: number;
  pageSize?: number;
}
