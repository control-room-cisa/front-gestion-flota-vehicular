import {
  TANQUE_DIESEL_MEDIDAS,
  alturaMaximaTanqueCm,
} from "../constants/tanque-diesel.constants";

/** Metros cúbicos por galón estadounidense. */
const M3_PER_US_GAL = 0.003785411784;

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
 * Área del segmento circular (m²). Tanque cilíndrico horizontal;
 * h = altura del líquido desde el fondo, en metros.
 */
export const areaSegmentoCircularM2 = (
  alturaNivelMetros: number,
  radioMetros: number,
): number => {
  if (radioMetros <= 0 || alturaNivelMetros <= 0) return 0;
  const diametro = radioMetros * 2;
  const h = Math.min(alturaNivelMetros, diametro);
  if (h >= diametro) return Math.PI * radioMetros * radioMetros;

  const cosArg = Math.max(-1, Math.min(1, (radioMetros - h) / radioMetros));
  const triBase = Math.max(0, 2 * radioMetros * h - h * h);
  return (
    radioMetros * radioMetros * Math.acos(cosArg) -
    (radioMetros - h) * Math.sqrt(triBase)
  );
};

/** Capacidad teórica llena (V = π·r²·L) convertida a galones US. */
export const capacidadGalonesCilindroCalculada = (
  diametroMetros: number,
  longitudMetros: number,
): number | null => {
  if (diametroMetros <= 0 || longitudMetros <= 0) return null;
  const radio = diametroMetros / 2;
  const volM3 = Math.PI * radio * radio * longitudMetros;
  return volM3 / M3_PER_US_GAL;
};

/**
 * Volumen parcial en galones según altura del combustible desde la base (cm).
 * Usa las dimensiones físicas del tanque; el tope es la capacidad nominal fija.
 */
export const volumenGalonesDesdeAltura = (
  alturaNivelCm: number,
  diametroMetros: number,
  longitudMetros: number,
): number | null => {
  if (diametroMetros <= 0 || longitudMetros <= 0) return null;
  if (alturaNivelCm <= 0) return 0;

  const alturaNivelMetros = alturaNivelCm / 100;
  const radioMetros = diametroMetros / 2;
  const areaM2 = areaSegmentoCircularM2(alturaNivelMetros, radioMetros);
  const volM3 = areaM2 * longitudMetros;
  const galones = volM3 / M3_PER_US_GAL;

  return Math.min(galones, capacidadTanqueDieselGalones());
};

/** Capacidad nominal fija del tanque (especificación técnica, no calculada). */
export const capacidadTanqueDieselGalones = (): number =>
  TANQUE_DIESEL_MEDIDAS.capacidadNominalGalones;

/** Volumen según nivel de combustible en cm (usa {@link TANQUE_DIESEL_MEDIDAS}). */
export const volumenGalonesDesdeAlturaTanque = (
  alturaNivelCm: number,
): number | null =>
  volumenGalonesDesdeAltura(
    alturaNivelCm,
    TANQUE_DIESEL_MEDIDAS.diametroMetros,
    TANQUE_DIESEL_MEDIDAS.longitudMetros,
  );

export { alturaMaximaTanqueCm };
