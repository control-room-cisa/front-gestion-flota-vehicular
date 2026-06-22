import { CATEGORIA_CODIGO_VEHICULOS_LIVIANOS } from '../../categorias/types/categoria.types';
import type { CategoriaDto } from '../../categorias/types/categoria.types';
import type { UnidadDto } from '../../unidades/types/unidad.types';

export const getCategoriaVehiculosLivianosId = (
  categorias: CategoriaDto[],
): number | undefined =>
  categorias.find((c) => c.codigo === CATEGORIA_CODIGO_VEHICULOS_LIVIANOS)?.id;

/** Unidades aptas para el módulo Uso maquinaria (excluye vehículos livianos). */
export const filterUnidadesMaquinaria = (
  unidades: UnidadDto[],
  categoriaVehiculosLivianosId: number | undefined,
): UnidadDto[] => {
  if (categoriaVehiculosLivianosId === undefined) return unidades;
  return unidades.filter((u) => u.categoriaId !== categoriaVehiculosLivianosId);
};

export const unidadUsaKilometraje = (u: UnidadDto | null): boolean =>
  u?.tipoMedicion === 'KILOMETRAJE';

export const unidadUsaHorometro = (u: UnidadDto | null): boolean =>
  u?.tipoMedicion === 'HOROMETRO' || u?.tipoMedicion === 'HORAS_USO';

const formatMedicionValor = (n: number | null | undefined): string =>
  n != null ? n.toLocaleString('es-GT') : '—';

export interface RegistroMedicionFila {
  inicio: string;
  fin: string;
  uso: string;
}

/** Valores de inicio, fin y uso para la tabla según tipo de medición de la unidad. */
export const getRegistroMedicionFila = (
  registro: {
    kilometrajeInicial: number | null;
    kilometrajeFinal: number | null;
    horaInicial: number | null;
    horaFinal: number | null;
  },
  unidad: UnidadDto | null | undefined,
): RegistroMedicionFila => {
  const usaKm =
    unidad != null
      ? unidadUsaKilometraje(unidad)
      : registro.kilometrajeInicial != null ||
        registro.kilometrajeFinal != null;

  if (usaKm) {
    const diferencia =
      registro.kilometrajeInicial != null &&
      registro.kilometrajeFinal != null
        ? registro.kilometrajeFinal - registro.kilometrajeInicial
        : null;
    return {
      inicio: formatMedicionValor(registro.kilometrajeInicial),
      fin: formatMedicionValor(registro.kilometrajeFinal),
      uso:
        diferencia !== null
          ? `${diferencia.toLocaleString('es-GT')} km`
          : '—',
    };
  }

  const diferencia =
    registro.horaInicial != null && registro.horaFinal != null
      ? registro.horaFinal - registro.horaInicial
      : null;
  return {
    inicio: formatMedicionValor(registro.horaInicial),
    fin: formatMedicionValor(registro.horaFinal),
    uso:
      diferencia !== null
        ? `${diferencia.toLocaleString('es-GT')} horas`
        : '—',
  };
};
