import { apiClient } from '../http/api-client';

export interface ConfiguracionDto {
  id: number;
  nombre: string;
  valor: string;
  updatedAt: string;
}

const BASE = '/configuraciones';
const opts = { auth: true };

/**
 * Servicio compartido de configuraciones (lectura/escritura desde cualquier módulo).
 */
export const configuracionService = {
  list: () => apiClient.get<ConfiguracionDto[]>(BASE, opts),

  getByNombre: (nombre: string) =>
    apiClient.get<ConfiguracionDto>(
      `${BASE}/nombre/${encodeURIComponent(nombre)}`,
      opts,
    ),

  /** Lectura del valor; lanza si la clave no existe. */
  getValor: async (nombre: string): Promise<string> => {
    const item = await configuracionService.getByNombre(nombre);
    return item.valor;
  },

  setValor: (nombre: string, valor: string) =>
    apiClient.put<{ valor: string }, ConfiguracionDto>(
      `${BASE}/nombre/${encodeURIComponent(nombre)}`,
      { valor },
      opts,
    ),
};
