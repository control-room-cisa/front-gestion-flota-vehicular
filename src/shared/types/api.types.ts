/**
 * Contrato compartido entre backend y frontend.
 * Mantener este archivo idéntico en ambos proyectos.
 *
 * Reglas:
 *  - Toda respuesta HTTP del backend devuelve un `ApiResponse<T>`,
 *    sea éxito o error.
 *  - `success` y `message` son SIEMPRE obligatorios.
 *  - `data` aparece solo cuando hay payload útil (típicamente en éxito).
 *  - `errors` aparece solo cuando hay detalle de fallos
 *    (típicamente en validación o errores de negocio).
 *  - Toda petición con body usa `ApiRequest<T>`: el payload viaja
 *    siempre dentro de `data`.
 */

export interface ApiErrorDetail {
  field?: string;
  code?: string;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ApiErrorDetail[];
}

export interface ApiRequest<T = unknown> {
  data: T;
}

export const apiOk = <T>(data: T, message = 'OK'): ApiResponse<T> => ({
  success: true,
  message,
  data,
});

export const apiFail = <T = never>(
  message: string,
  errors: ApiErrorDetail[] = [],
): ApiResponse<T> => {
  const res: ApiResponse<T> = { success: false, message };
  if (errors.length > 0) res.errors = errors;
  return res;
};
