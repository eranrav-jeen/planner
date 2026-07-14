import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useCreateEmployee, useEmployees } from '../../api/employees';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { EmployeeForm } from './EmployeeForm';
import { useAuth } from '../../lib/auth';

export function EmployeesList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const { data, isLoading } = useEmployees({ search });
  const createEmployee = useCreateEmployee();

  return (
    <div>
      <PageHeader
        title="Employees"
        actions={
          canEdit && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> New employee
            </Button>
          )
        }
      />
      <div className="mb-4 flex gap-3">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search employees..."
            className="ps-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="px-5 py-3 text-start font-medium">Name</th>
              <th className="px-5 py-3 text-start font-medium">Title</th>
              <th className="px-5 py-3 text-start font-medium">Department</th>
              <th className="px-5 py-3 text-start font-medium">Capacity</th>
              <th className="px-5 py-3 text-start font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-muted">
                  Loading...
                </td>
              </tr>
            )}
            {data?.items.map((employee) => (
              <tr
                key={employee.id}
                onClick={() => navigate(`/employees/${employee.id}`)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-bg"
              >
                <td className="px-5 py-3 font-medium">
                  {employee.firstName} {employee.lastName}
                </td>
                <td className="px-5 py-3 text-muted">{employee.title || '—'}</td>
                <td className="px-5 py-3 text-muted">{employee.department || '—'}</td>
                <td className="px-5 py-3 tabular-nums">{employee.monthlyCapacityHours}h</td>
                <td className="px-5 py-3">
                  <Badge status={employee.isActive ? 'active' : 'inactive'}>
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <EmployeeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        isSubmitting={createEmployee.isPending}
        onSubmit={(input) => createEmployee.mutate(input, { onSuccess: () => setFormOpen(false) })}
      />
    </div>
  );
}
