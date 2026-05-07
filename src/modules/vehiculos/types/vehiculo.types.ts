/**
 * Tipos del módulo Vehículos. Mantener idénticos a
 * back/src/modules/vehiculos/dtos/vehiculo.dtos.ts
 */

export interface VehiculoDto {
  id: number;
  nombre: string;
  clase: string;
  activo: boolean;
}

export interface CreateVehiculoDto {
  nombre: string;
  clase: string;
}

export interface UpdateVehiculoDto {
  nombre?: string;
  clase?: string;
  activo?: boolean;
}
