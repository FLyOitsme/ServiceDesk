import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { AppRole } from '../api/api';
import ForbiddenPage from './ForbiddenPage';

export function RequireRole({ roles }: { roles: AppRole[] }) {
  const { role } = useAuth();
  if (!role || !roles.includes(role)) return <ForbiddenPage />;
  return <Outlet />;
}
