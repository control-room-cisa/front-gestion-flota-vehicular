import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Hostnames permitidos por Vite (server.allowedHosts). Lee ALLOWED_HOSTS: lista separada por comas; admite URLs (solo se usa el hostname). */
function parseAllowedHosts(raw: string | undefined): string[] | undefined {
  if (!raw?.trim()) return undefined
  const hosts: string[] = []
  for (const part of raw.split(',')) {
    const segment = part.trim()
    if (!segment) continue
    let host = segment
    if (segment.includes('://')) {
      try {
        host = new URL(segment).hostname
      } catch {
        host = segment.replace(/^https?:\/\//i, '').split('/')[0] ?? segment
      }
    } else {
      host = segment.split('/')[0] ?? segment
    }
    if (host) hosts.push(host)
  }
  return hosts.length ? hosts : undefined
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const envVars = loadEnv(mode, process.cwd(), '')
  // 3005 por defecto: 3004 suele reservarse al API (PORT en el backend)
  const port = Number(envVars.VITE_PORT) || 3005
  const apiUrl = (envVars.VITE_API_URL ?? '/api').trim()
  const backendPort = Number.parseInt(envVars.BACKEND_PORT ?? '', 10)
  const useApiProxy =
    apiUrl.startsWith('/') &&
    Number.isFinite(backendPort) &&
    backendPort > 0

  const proxy =
    useApiProxy && apiUrl.length > 0
      ? {
          [apiUrl.replace(/\/+$/, '') || '/api']: {
            target: `http://127.0.0.1:${backendPort}`,
            changeOrigin: true,
          },
        }
      : undefined

  const allowedHosts = parseAllowedHosts(envVars.ALLOWED_HOSTS)

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port,
      strictPort: true,
      ...(allowedHosts ? { allowedHosts } : {}),
      ...(proxy ? { proxy } : {}),
    },
    preview: {
      port,
      strictPort: true,
      ...(allowedHosts ? { allowedHosts } : {}),
      ...(proxy ? { proxy } : {}),
    },
  }
})
