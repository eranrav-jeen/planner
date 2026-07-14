import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { useEmployee, useUpdateEmployee, useDeleteEmployee } from '../../api/employees';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { ErrorState } from '../../components/ui/error-state';
import { EmployeeForm } from './EmployeeForm';
import { useAuth, ApiRequestError } from '../../lib/auth';
import { formatHours } from '../../lib/format';

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const { data: employee, isLoading, isError, refetch } = useEmployee(id);
  const updateEmployee = useUpdateEmployee(id!);
  const deleteEmployee = useDeleteEmployee();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (isLoading) {
    return <div className="text-sm text-muted">Loading...</div>;
  }
  if (isError || !employee) {
    return <ErrorState message="Couldn't load this employee." onRetry={refetch} />;
  }

  return (
    <div>
      <PageHeader
        title={`${employee.firstName} ${employee.lastName}`}
        actions={
          canEdit && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setFormOpen(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
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
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete employee"
        description={`Permanently delete "${employee.firstName} ${employee.lastName}"? This cannot be undone.`}
        error={deleteError}
        isSubmitting={deleteEmployee.isPending}
        onConfirm={() =>
          deleteEmployee.mutate(employee.id, {
            onSuccess: () => navigate('/employees'),
            onError: (err) =>
              setDeleteError(err instanceof ApiRequestError ? err.message : 'Failed to delete'),
          })
        }
      />
    </div>
  );
}
