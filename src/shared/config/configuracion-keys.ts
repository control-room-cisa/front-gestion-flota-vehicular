/** Claves conocidas de configuración del sistema. */
export const CONFIGURACION_KEYS = {
  PRECIO_COMBUSTIBLE: 'PRECIO_COMBUSTIBLE',
} as const;

export type ConfiguracionKey =
  (typeof CONFIGURACION_KEYS)[keyof typeof CONFIGURACION_KEYS];
