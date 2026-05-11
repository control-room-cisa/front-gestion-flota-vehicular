import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port,
      strictPort: true,
      ...(proxy ? { proxy } : {}),
    },
    preview: {
      port,
      strictPort: true,
      ...(proxy ? { proxy } : {}),
    },
  }
})
