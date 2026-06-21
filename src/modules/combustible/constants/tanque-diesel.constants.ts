/**
 * Dimensiones fijas del tanque diesel (cilindro horizontal).
 * Medidas de campo con metro; cálculos de volumen en metros.
 *
 * La capacidad nominal (5 000 gal) es el valor fijo de ficha técnica.
 * El diámetro y la longitud solo alimentan la fórmula de diesel disponible.
 */
export const TANQUE_DIESEL_MEDIDAS = {
  /** Diámetro interior (cm), medida de campo. */
  diametroCm: 289.5,
  /** Longitud del cilindro (cm), medida de campo. */
  longitudCm: 290,
  /** Diámetro interior (m). */
  diametroMetros: 2.895,
  /** Longitud del cilindro (m). */
  longitudMetros: 2.9,
  /** Capacidad nominal fija (galones US), especificación técnica. */
  capacidadNominalGalones: 5000,
} as const;

/** Altura máxima del combustible desde la base (= diámetro), en cm. */
export const alturaMaximaTanqueCm = (): number =>
  TANQUE_DIESEL_MEDIDAS.diametroCm;
