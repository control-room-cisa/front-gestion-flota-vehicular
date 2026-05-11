import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { ApiError } from '../../../shared/http/api-client';
import { useAuth } from '../../../shared/auth/AuthContext';
import { getHomeRoute } from '../../../shared/auth/role-routes';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (identificador: string, contrasena: string) => {
    setIsLoading(true);
    setError(undefined);
    try {
      const { usuario } = await login({ identificador, contrasena });
      navigate(getHomeRoute(usuario.roles), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('No se pudo conectar con el servidor (Backend inactivo).');
      } else {
        setError('Error inesperado. Intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-[20%] right-[-5%] w-96 h-96 bg-violet-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-fuchsia-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main card */}
      <div className="z-10 w-full max-w-md px-6">
        <div className="backdrop-blur-xl bg-white/70 shadow-2xl rounded-3xl border border-white/50 p-8 sm:p-10 flex flex-col items-center">
          
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg mb-6 transform -rotate-6 animate-fade-in-up">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white transform rotate-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>

          <div className="text-center mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              Control <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Vehicular</span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm sm:text-base">
              Acceso exclusivo para personal autorizado
            </p>
          </div>

          <div className="w-full animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
             <LoginForm onSubmit={handleLogin} error={error} isLoading={isLoading} />
          </div>

        </div>
        
        <p className="text-center text-slate-400 text-sm mt-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          &copy; {new Date().getFullYear()} Gestión de Flotas CISA.
        </p>
      </div>
    </div>
  );
};
