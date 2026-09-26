import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { AppUserRole } from 'shared';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  /** Jeśli podane, dostęp mają tylko użytkownicy z jedną z tych ról (admin i tak
   *  przechodzi wszędzie tam, gdzie backend go dopuszcza — to tylko kontrola UX). */
  roles?: AppUserRole[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Ładowanie…</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.rola)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
