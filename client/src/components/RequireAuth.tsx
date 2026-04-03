import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageLoading from './PageLoading';

export function RequireAuth() {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!user) return <PageLoading tip="Загрузка профиля…" />;
  return <Outlet />;
}
