import { Routes, Route } from 'react-router-dom';
import { useLanguage } from './lib/i18n';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { SetPassword } from './pages/SetPassword';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { ComingSoon } from './pages/ComingSoon';
import { CustomersList } from './pages/customers/CustomersList';
import { CustomerDetail } from './pages/customers/CustomerDetail';
import { EmployeesList } from './pages/employees/EmployeesList';
import { EmployeeDetail } from './pages/employees/EmployeeDetail';
import { ProjectsList } from './pages/projects/ProjectsList';
import { ProjectDetail } from './pages/projects/ProjectDetail';
import { Planning } from './pages/planning/Planning';
import { Reports } from './pages/reports/Reports';
import { GanttPage } from './pages/gantt/Gantt';
import { Actuals } from './pages/actuals/Actuals';
import { Settings } from './pages/settings/Settings';

export default function App() {
  const { t } = useLanguage();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
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
        <Route path="planning" element={<Planning />} />
        <Route path="reports" element={<Reports />} />
        <Route path="gantt" element={<GanttPage />} />
        <Route path="actuals" element={<Actuals />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
