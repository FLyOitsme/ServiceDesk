import { Navigate } from 'react-router-dom';

/** Сохраняем маршрут /register из методички: та же форма, что на вкладке «Регистрация» на /login. */
export default function RegisterPage() {
  return <Navigate to="/login?tab=register" replace />;
}
