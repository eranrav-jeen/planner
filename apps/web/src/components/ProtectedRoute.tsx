import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type Role } from '../lib/auth';
import { useLanguage } from '../lib/i18n';

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-sm text-muted">{t('common.loading')}</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
