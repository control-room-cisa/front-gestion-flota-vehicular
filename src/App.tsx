import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider } from './shared/auth/AuthContext';
import { ConfirmProvider } from './shared/components/ConfirmProvider';
import { ToastProvider } from './shared/components/ToastProvider';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <RouterProvider router={router} />
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
