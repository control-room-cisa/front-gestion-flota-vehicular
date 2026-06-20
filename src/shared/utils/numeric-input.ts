/**
 * Utilidades para campos numéricos en formularios.
 * Usar `type="text"` + `inputMode` en lugar de `type="number"` para evitar
 * caracteres como e, E, + que los navegadores permiten en inputs number.
 */

/** Solo dígitos (enteros no negativos). */
export const sanitizeIntegerInput = (raw: string): string =>
  raw.replace(/\D/g, '');

/**
 * Decimal positivo con un separador y hasta `maxDecimals` cifras decimales.
 * Acepta coma o punto como separador durante la edición.
 */
export const sanitizeDecimalInput = (
  raw: string,
  maxDecimals = 2,
): string => {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (cleaned === '') return '';

  const sepIdx = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
  if (sepIdx === -1) return cleaned.replace(/[.,]/g, '');

  const intPart = cleaned.slice(0, sepIdx).replace(/[.,]/g, '');
  let fracPart = cleaned.slice(sepIdx + 1).replace(/[.,]/g, '');
  fracPart = fracPart.slice(0, maxDecimals);

  const sep = cleaned[sepIdx];
  if (
    fracPart.length === 0 &&
    (cleaned.endsWith('.') || cleaned.endsWith(','))
  ) {
    return intPart + sep;
  }

  return fracPart.length > 0 ? `${intPart}${sep}${fracPart}` : intPart;
};

export const parseIntegerInput = (raw: string): number | null => {
  const t = raw.trim();
  if (!t || !/^\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isSafeInteger(n) ? n : null;
};

/** Convierte texto de entrada a número decimal (acepta coma o punto). */
export const parseDecimalInput = (raw: string): number | null => {
  const norm = raw.trim().replace(',', '.');
  if (norm === '' || norm === '.') return null;
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
};
