const required = (key: string, value: string | undefined): string => {
  if (!value || value.trim() === '') {
    throw new Error(`Variable de entorno requerida: ${key}`);
  }
  return value;
};

export const env = {
  API_URL: required('VITE_API_URL', import.meta.env.VITE_API_URL),
} as const;
