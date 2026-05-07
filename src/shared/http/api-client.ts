import { env } from '../../config/env';
import type { ApiRequest, ApiResponse } from '../types/api.types';

export class ApiError extends Error {
  status: number;
  errors: { field?: string; code?: string; message: string }[];

  constructor(
    message: string,
    status: number,
    errors: { field?: string; code?: string; message: string }[] = [],
  ) {
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

const handleResponse = async <T>(res: Response): Promise<T> => {
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new ApiError(json.message ?? 'Error', res.status, json.errors ?? []);
  }
  return json.data as T;
};

export const apiClient = {
  async post<TBody, TData>(
    path: string,
    body: TBody,
    options: RequestOptions = {},
  ): Promise<TData> {
    const payload: ApiRequest<TBody> = { data: body };
    const res = await fetch(`${env.API_URL}${path}`, {
      method: 'POST',
      headers: buildHeaders(options.auth),
      body: JSON.stringify(payload),
    });
    return handleResponse<TData>(res);
  },

  async get<TData>(path: string, options: RequestOptions = {}): Promise<TData> {
    const res = await fetch(`${env.API_URL}${path}`, {
      method: 'GET',
      headers: buildHeaders(options.auth),
    });
    return handleResponse<TData>(res);
  },
};
