import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SignalRProvider } from './contexts/SignalRContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ExamPage from './pages/ExamPage';
import ResultPage from './pages/ResultPage';
import LobbyPage from './pages/LobbyPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--color-text-muted)]">Yükleniyor...</div>
      </div>
    );
  }
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  if (isLoading) return null;
  return token ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/exam/:examId" element={<PrivateRoute><ExamPage /></PrivateRoute>} />
      <Route path="/lobby/:roomCode" element={<PrivateRoute><LobbyPage /></PrivateRoute>} />
      <Route path="/results/:resultId" element={<PrivateRoute><ResultPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SignalRProvider>
          <AppRoutes />
        </SignalRProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
