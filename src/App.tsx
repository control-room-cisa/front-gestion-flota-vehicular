import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider } from './shared/auth/AuthContext';
import { ConfirmProvider } from './shared/components/ConfirmProvider';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <RouterProvider router={router} />
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;
