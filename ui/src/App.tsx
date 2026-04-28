import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './auth-context.tsx';
import api from './api.ts';
import Setup from './pages/Setup.tsx';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Admin from './pages/Admin.tsx';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00b4d8' },
    background: { default: '#0d1117', paper: '#161b22' },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);

  useEffect(() => {
    api.get<{ setupRequired: boolean }>('/auth/status')
      .then((r) => {
        setSetupRequired(r.data.setupRequired);
        if (r.data.setupRequired) navigate('/setup', { replace: true });
      })
      .catch(() => setSetupRequired(false));
  }, [navigate]);

  if (setupRequired === null) return null; // loading

  return (
    <Routes>
      <Route path="/setup" element={<Setup onSetup={login} />} />
      <Route path="/login" element={<Login onLogin={login} />} />
      <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
      <Route path="/admin" element={<AuthGuard><Admin /></AuthGuard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
