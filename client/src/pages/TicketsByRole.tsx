import { useAuth } from '../contexts/AuthContext';
import ForbiddenPage from '../components/ForbiddenPage';
import ClientTickets from './client/ClientTickets';
import MasterTickets from './master/MasterTickets';
import AdminTickets from './admin/AdminTickets';

export default function TicketsByRole() {
  const { role } = useAuth();
  if (role === 'client') return <ClientTickets />;
  if (role === 'master') return <MasterTickets />;
  if (role === 'admin') return <AdminTickets />;
  return <ForbiddenPage />;
}
