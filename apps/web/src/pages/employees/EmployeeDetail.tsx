import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { useEmployee, useUpdateEmployee } from '../../api/employees';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { EmployeeForm } from './EmployeeForm';
import { useAuth } from '../../lib/auth';
import { formatHours } from '../../lib/format';

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const { data: employee, isLoading } = useEmployee(id);
  const updateEmployee = useUpdateEmployee(id!);
  const [formOpen, setFormOpen] = useState(false);

  if (isLoading || !employee) {
    return <div className="text-sm text-muted">Loading...</div>;
  }

  return (
    <div>
      <PageHeader
        title={`${employee.firstName} ${employee.lastName}`}
        actions={
          canEdit && (
            <Button variant="secondary" onClick={() => setFormOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <p>
            <span className="text-muted">Email: </span>
            {employee.email}
          </p>
          <p>
            <span className="text-muted">Title: </span>
            {employee.title || '—'}
          </p>
          <p>
            <span className="text-muted">Department: </span>
            {employee.department || '—'}
          </p>
          <p>
            <span className="text-muted">Employment: </span>
            {employee.employmentType.replace('_', ' ')}
          </p>
          <p>
            <span className="text-muted">Monthly capacity: </span>
            {formatHours(employee.monthlyCapacityHours)}
          </p>
          {employee.costRateHourly !== undefined && (
            <p>
              <span className="text-muted">Cost rate: </span>
              {employee.costRateHourly ?? '—'}
            </p>
          )}
          <p>
            <span className="text-muted">Status: </span>
            <Badge status={employee.isActive ? 'active' : 'inactive'}>
              {employee.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project assignments</CardTitle>
        </CardHeader>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="px-5 py-3 text-start font-medium">Project</th>
              <th className="px-5 py-3 text-start font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {(!employee.assignments || employee.assignments.length === 0) && (
              <tr>
                <td colSpan={2} className="px-5 py-6 text-center text-muted">
                  No assignments yet.
                </td>
              </tr>
            )}
            {employee.assignments?.map((assignment) => (
              <tr key={assignment.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{assignment.project.name}</td>
                <td className="px-5 py-3 text-muted">{assignment.roleOnProject || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <EmployeeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={employee}
        isSubmitting={updateEmployee.isPending}
        onSubmit={(input) => updateEmployee.mutate(input, { onSuccess: () => setFormOpen(false) })}
      />
    </div>
  );
}
