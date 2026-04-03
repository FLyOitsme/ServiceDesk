import { useAuth } from '../contexts/AuthContext';
import ForbiddenPage from '../components/ForbiddenPage';
import ClientDashboard from './client/ClientDashboard';
import MasterDashboard from './master/MasterDashboard';
import AdminDashboard from './admin/AdminDashboard';

export default function DashboardByRole() {
  const { role } = useAuth();
  if (role === 'client') return <ClientDashboard />;
  if (role === 'master') return <MasterDashboard />;
  if (role === 'admin') return <AdminDashboard />;
  return <ForbiddenPage />;
}
