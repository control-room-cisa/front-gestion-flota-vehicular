/**
 * Tipos del módulo Movilizaciones. Mantener idénticos a
 * back/src/modules/movilizaciones/dtos/movilizacion.dtos.ts
 */

export interface MovilizacionUsuarioDto {
  id: number;
  codigo_empleado: string;
  nombre: string;
  apellido: string;
}

export interface MovilizacionEmpresaDto {
  id: number;
  codigo: string;
  nombre: string;
}

export interface MovilizacionVehiculoDto {
  id: number;
  nombre: string;
  clase: string;
}

export interface MovilizacionDto {
  id: number;
  fecha: string;
  kilometrajeInicial: number;
  kilometrajeFinal: number;
  comentario: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  usuario: MovilizacionUsuarioDto;
  vehiculo: MovilizacionVehiculoDto;
  empresas: MovilizacionEmpresaDto[];
  canManage: boolean;
}

export interface CreateMovilizacionDto {
  fecha: string;
  kilometrajeInicial: number;
  kilometrajeFinal: number;
  comentario: string;
  vehiculoId: number;
  empresaIds: number[];
  /** Sólo lo respetan los managers; los demás siempre son ellos mismos. */
  userId?: number;
}

export interface UpdateMovilizacionDto {
  fecha?: string;
  kilometrajeInicial?: number;
  kilometrajeFinal?: number;
  comentario?: string;
  vehiculoId?: number;
  empresaIds?: number[];
  userId?: number;
}

/**
 * Resumen de la última movilización registrada para un vehículo.
 * Sirve para alertar al usuario cuando el `kilometrajeInicial` no
 * coincide con el `kilometrajeFinal` del registro previo.
 */
export interface UltimaMovilizacionVehiculoDto {
  id: number;
  fecha: string;
  kilometrajeInicial: number;
  kilometrajeFinal: number;
}

/**
 * Filtros y paginado del listado de movilizaciones (lo que viaja por
 * query string). Mantener idéntico al backend.
 */
export interface MovilizacionListQuery {
  /** ISO completo (preferentemente inicio de día en TZ local). */
  desde?: string;
  /** ISO completo (preferentemente fin de día en TZ local). */
  hasta?: string;
  vehiculoId?: number;
  page?: number;
  pageSize?: number;
}
