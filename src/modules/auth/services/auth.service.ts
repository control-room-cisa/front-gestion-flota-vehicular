import { apiClient, tokenStorage } from '../../../shared/http/api-client';
import type { AuthResponseDto, LoginDto, UsuarioPublicoDto } from '../types/auth.types';

export const authService = {
  async login(credentials: LoginDto): Promise<AuthResponseDto> {
    const data = await apiClient.post<LoginDto, AuthResponseDto>(
      '/auth/login',
      credentials,
    );
    tokenStorage.set(data.token);
    return data;
  },

  me: () => apiClient.get<UsuarioPublicoDto>('/auth/me', { auth: true }),

  logout: () => tokenStorage.clear(),
};
