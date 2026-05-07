import { env } from '../../config/env';
import type { ApiErrorDetail, ApiRequest, ApiResponse } from '../types/api.types';

/**
 * Error lanzado cuando el backend devuelve `ApiResponse.success === false`
 * o cuando la respuesta HTTP no es JSON parseable.
 */
export class ApiError extends Error {
  status: number;
  errors: ApiErrorDetail[];

  constructor(message: string, status: number, errors: ApiErrorDetail[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

const TOKEN_KEY = 'token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

interface RequestOptions {
  auth?: boolean;
}

const buildHeaders = (auth: boolean | undefined): HeadersInit => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth) {
    const token = tokenStorage.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Toma la respuesta cruda y la valida contra `ApiResponse<TData>`.
 * Si `success` es false lanza `ApiError`; si es true devuelve `data`.
 */
const unwrap = async <TData>(res: Response): Promise<TData> => {
  const json = (await res.json()) as ApiResponse<TData>;
  if (!json.success) {
    throw new ApiError(json.message ?? 'Error', res.status, json.errors ?? []);
  }
  return json.data as TData;
};

/**
 * Empaqueta el body como `ApiRequest<TBody>` (lo que espera el backend) y
 * desempaqueta la respuesta como `ApiResponse<TData>`. Quien llame al cliente
 * sólo trabaja con tipos de dominio (TBody, TData); el envelope `data` es
 * responsabilidad del cliente.
 */
const request = async <TData, TBody = undefined>(
  method: string,
  path: string,
  body: TBody | undefined,
  options: RequestOptions,
): Promise<TData> => {
  const init: RequestInit = {
    method,
    headers: buildHeaders(options.auth),
  };
  if (body !== undefined) {
    const payload: ApiRequest<TBody> = { data: body };
    init.body = JSON.stringify(payload);
  }
  const res = await fetch(`${env.API_URL}${path}`, init);
  return unwrap<TData>(res);
};

export const apiClient = {
  get: <TData>(path: string, options: RequestOptions = {}): Promise<TData> =>
    request<TData>('GET', path, undefined, options),

  post: <TBody, TData>(
    path: string,
    body?: TBody,
    options: RequestOptions = {},
  ): Promise<TData> => request<TData, TBody>('POST', path, body, options),

  put: <TBody, TData>(
    path: string,
    body: TBody,
    options: RequestOptions = {},
  ): Promise<TData> => request<TData, TBody>('PUT', path, body, options),

  delete: <TData>(path: string, options: RequestOptions = {}): Promise<TData> =>
    request<TData>('DELETE', path, undefined, options),
};
