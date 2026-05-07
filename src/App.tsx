import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider } from './shared/auth/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
