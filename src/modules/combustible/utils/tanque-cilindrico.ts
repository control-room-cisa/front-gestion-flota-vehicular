import { TANQUE_DIESEL_MEDIDAS } from "../constants/tanque-diesel.constants";

/** Pulgadas cúbicas por galón estadounidense. */
const CU_IN_PER_US_GAL = 231;

/** Formato visual de galones: 2 decimales; los cálculos usan precisión completa. */
export const formatGalonesDisplay = (galones: number): string =>
  galones.toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Porcentaje de llenado (0–100) con un decimal para la visual. */
export const formatPorcentajeDisplay = (porcentaje: number): string =>
  porcentaje.toLocaleString("es-HN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

/**
 * Área del segmento circular (in²). Tanque cilíndrico horizontal;
 * h = altura del líquido desde el fondo, en pulgadas.
 */
export const areaSegmentoCircularIn2 = (
  alturaNivelPulgadas: number,
  radioPulgadas: number,
): number => {
  if (radioPulgadas <= 0 || alturaNivelPulgadas <= 0) return 0;
  const diametro = radioPulgadas * 2;
  const h = Math.min(alturaNivelPulgadas, diametro);
  if (h >= diametro) return Math.PI * radioPulgadas * radioPulgadas;

  const cosArg = Math.max(-1, Math.min(1, (radioPulgadas - h) / radioPulgadas));
  const triBase = Math.max(0, 2 * radioPulgadas * h - h * h);
  return (
    radioPulgadas * radioPulgadas * Math.acos(cosArg) -
    (radioPulgadas - h) * Math.sqrt(triBase)
  );
};

/** Capacidad nominal (tanque lleno) en galones. V = π·r²·L (pulg³ → gal). */
export const capacidadGalonesCilindro = (
  alturaTanquePulgadas: number,
  longitudPulgadas: number,
): number | null => {
  if (alturaTanquePulgadas <= 0 || longitudPulgadas <= 0) return null;
  const radio = alturaTanquePulgadas / 2;
  const volIn3 = Math.PI * radio * radio * longitudPulgadas;
  return volIn3 / CU_IN_PER_US_GAL;
};

/** Volumen parcial en galones según altura del combustible desde la base (pulgadas). */
export const volumenGalonesDesdeAltura = (
  alturaNivelPulgadas: number,
  alturaTanquePulgadas: number,
  longitudPulgadas: number,
): number | null => {
  if (alturaTanquePulgadas <= 0 || longitudPulgadas <= 0) return null;
  if (alturaNivelPulgadas <= 0) return 0;

  const radio = alturaTanquePulgadas / 2;
  const areaIn2 = areaSegmentoCircularIn2(alturaNivelPulgadas, radio);
  const volIn3 = areaIn2 * longitudPulgadas;
  const galones = volIn3 / CU_IN_PER_US_GAL;

  const capacidad = capacidadGalonesCilindro(
    alturaTanquePulgadas,
    longitudPulgadas,
  );
  if (capacidad !== null && galones > capacidad) return capacidad;
  return galones;
};

/** Capacidad nominal del tanque diesel (usa {@link TANQUE_DIESEL_MEDIDAS}). */
export const capacidadTanqueDieselGalones = (): number =>
  capacidadGalonesCilindro(
    TANQUE_DIESEL_MEDIDAS.alturaPulgadas,
    TANQUE_DIESEL_MEDIDAS.longitudPulgadas,
  ) ?? 0;

/** Volumen según nivel de combustible (usa {@link TANQUE_DIESEL_MEDIDAS}). */
export const volumenGalonesDesdeAlturaTanque = (
  alturaNivelPulgadas: number,
): number | null =>
  volumenGalonesDesdeAltura(
    alturaNivelPulgadas,
    TANQUE_DIESEL_MEDIDAS.alturaPulgadas,
    TANQUE_DIESEL_MEDIDAS.longitudPulgadas,
  );
