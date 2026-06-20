/**
 * Dimensiones fijas del tanque diesel (cilindro horizontal).
 * Única fuente de verdad: capacidad y volumen por nivel usan este objeto.
 */
export const TANQUE_DIESEL_MEDIDAS = {
  /** Diámetro interior / altura del cilindro (pulgadas). */
  alturaPulgadas: 60,
  /** Longitud del cilindro (pulgadas). */
  longitudPulgadas: 90,
} as const;
