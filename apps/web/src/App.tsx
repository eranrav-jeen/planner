import { Routes, Route } from 'react-router-dom';
import { useLanguage } from './lib/i18n';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ComingSoon } from './pages/ComingSoon';
import { CustomersList } from './pages/customers/CustomersList';
import { CustomerDetail } from './pages/customers/CustomerDetail';
import { EmployeesList } from './pages/employees/EmployeesList';
import { EmployeeDetail } from './pages/employees/EmployeeDetail';
import { ProjectsList } from './pages/projects/ProjectsList';
import { ProjectDetail } from './pages/projects/ProjectDetail';

export default function App() {
  const { t } = useLanguage();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<CustomersList />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="employees" element={<EmployeesList />} />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        <Route path="projects" element={<ProjectsList />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="planning" element={<ComingSoon title={t('nav.planning')} phase="Phase 2" />} />
        <Route path="reports" element={<ComingSoon title={t('nav.reports')} phase="Phase 3" />} />
        <Route path="gantt" element={<ComingSoon title={t('nav.gantt')} phase="Phase 4" />} />
        <Route path="settings" element={<ComingSoon title={t('nav.settings')} phase="Phase 6" />} />
      </Route>
    </Routes>
  );
}
