/**
 * Contrato compartido entre backend y frontend.
 * Mantener este archivo idéntico en ambos proyectos.
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

export const apiFail = (
  message: string,
  errors: ApiErrorDetail[] = [],
): ApiResponse<never> => ({
  success: false,
  message,
  errors,
});
