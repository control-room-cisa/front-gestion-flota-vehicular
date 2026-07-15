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
  /**
   * Km del recorrido asignados a esta empresa.
   * `null` = registro histórico sin valor; en edición se interpreta como
   * el recorrido completo de la movilización.
   */
  kmAsignados: number | null;
}

/** Asignación empresa + km al crear/actualizar (managers). */
export interface MovilizacionEmpresaAsignacionDto {
  empresaId: number;
  kmAsignados: number;
}

export interface MovilizacionUnidadDto {
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
  esViaje: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  usuario: MovilizacionUsuarioDto;
  unidad: MovilizacionUnidadDto;
  empresas: MovilizacionEmpresaDto[];
  canManage: boolean;
}

export interface CreateMovilizacionDto {
  fecha: string;
  kilometrajeInicial: number;
  kilometrajeFinal: number;
  comentario: string;
  unidadId: number;
  /**
   * Empresas y km asignados. Obligatorio para managers (mínimo 1).
   * Los no-manager no lo envían: se infiere empresa propia con km = recorrido.
   */
  empresas?: MovilizacionEmpresaAsignacionDto[];
  /** Solo lo respetan controlroom / logistica / admin. */
  esViaje?: boolean;
  /** Sólo lo respetan los managers; los demás siempre son ellos mismos. */
  userId?: number;
}

export interface UpdateMovilizacionDto {
  fecha?: string;
  kilometrajeInicial?: number;
  kilometrajeFinal?: number;
  comentario?: string;
  unidadId?: number;
  empresas?: MovilizacionEmpresaAsignacionDto[];
  /** Solo lo respetan controlroom / logistica / admin. */
  esViaje?: boolean;
  userId?: number;
}

/**
 * Resumen de la última movilización registrada para un vehículo.
 * Sirve para alertar al usuario cuando el `kilometrajeInicial` no
 * coincide con el `kilometrajeFinal` del registro previo.
 */
export interface UltimaMovilizacionUnidadDto {
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
  unidadId?: number;
  /** Dueño del registro. Managers: cualquier usuario; demás: solo el propio. */
  userId?: number;
  page?: number;
  pageSize?: number;
}

/** Km efectivos de una empresa (null histórico → recorrido completo). */
export const kmAsignadosEfectivos = (
  kmAsignados: number | null,
  recorrido: number,
): number => (kmAsignados === null ? recorrido : kmAsignados);

export interface EmpresaPorcentajeDto {
  id: number;
  codigo: string;
  nombre: string;
  km: number;
  /** Porcentaje sobre la suma de km asignados (no sobre el recorrido). */
  porcentaje: number;
}

/**
 * % de cada empresa = (kmEmpresa / sumaKmEmpresas) × 100.
 * El denominador es la sumatoria de km asignados, no el recorrido.
 */
export const calcularPorcentajesEmpresas = (
  empresas: MovilizacionEmpresaDto[],
  recorrido: number,
): EmpresaPorcentajeDto[] => {
  const conKm = empresas.map((e) => ({
    id: e.id,
    codigo: e.codigo,
    nombre: e.nombre,
    km: kmAsignadosEfectivos(e.kmAsignados, recorrido),
  }));
  const total = conKm.reduce((acc, e) => acc + e.km, 0);
  return conKm.map((e) => ({
    ...e,
    porcentaje: total > 0 ? (e.km / total) * 100 : 0,
  }));
};

/** Formatea un porcentaje con 2 decimales (ej. 41.67%). */
export const formatPorcentajeEmpresa = (porcentaje: number): string =>
  `${porcentaje.toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
