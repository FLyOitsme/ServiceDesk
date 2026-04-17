import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { RequireAuth } from './components/RequireAuth';
import { RequireRole } from './components/RequireRole';
import AppLayout from './components/AppLayout';
import PageNotFound from './components/PageNotFound';

import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';

import DashboardByRole from './pages/DashboardByRole';
import TicketsByRole from './pages/TicketsByRole';
import CreateTicket from './pages/client/CreateTicket';
import StockPage from './pages/master/StockPage';
import AdminUsers from './pages/admin/AdminUsers';
import AdminFinance from './pages/admin/AdminFinance';

import { homePathForRole } from './lib/roleHome';
import PageLoading from './components/PageLoading';

function RootRedirect() {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!user) return <PageLoading tip="Загрузка профиля…" />;
  return <Navigate to={homePathForRole(user.role)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardByRole />} />

            <Route element={<RequireRole roles={['client']} />}>
              <Route path="/tickets/new" element={<CreateTicket />} />
            </Route>

            <Route path="/tickets" element={<TicketsByRole />} />

            <Route element={<RequireRole roles={['master']} />}>
              <Route path="/stock" element={<StockPage />} />
            </Route>

            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="/users" element={<AdminUsers />} />
              <Route path="/finance" element={<AdminFinance />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
