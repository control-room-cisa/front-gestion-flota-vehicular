const required = (key: string, value: string | undefined): string => {
  if (!value || value.trim() === '') {
    throw new Error(`Variable de entorno requerida: ${key}`);
  }
  return value;
};

/**
 * Base de la API para `fetch`. Debe ser:
 * - URL absoluta: `http://host:puerto/api` o `https://...`
 * - Ruta en el mismo origen: `/api` (p. ej. detrás de proxy)
 * Si falta el esquema (`http://` / `https://`) y no empieza por `/`, el
 * navegador interpreta el valor como ruta relativa (bug: `host:3002/api/...`
 * bajo `http://127.0.0.1:3004/...`). Ante `host:puerto/...` se asume `http://`.
 */
const normalizeApiUrl = (raw: string): string => {
  const u = raw.trim();
  if (/^https?:\/\//i.test(u)) return u.replace(/\/+$/, '');
  if (u.startsWith('/')) return u.replace(/\/+$/, '') || u;
  return `http://${u}`.replace(/\/+$/, '');
};

export const env = {
  API_URL: normalizeApiUrl(required('VITE_API_URL', import.meta.env.VITE_API_URL)),
} as const;
