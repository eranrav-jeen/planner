import { useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, UserPlus } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import {
  useAddAssignment,
  useDeleteProject,
  useProject,
  useRemoveAssignment,
  useUpdateProject,
} from '../../api/projects';
import { useEmployees } from '../../api/employees';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input, Select } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { ProjectForm } from './ProjectForm';
import { useAuth, ApiRequestError } from '../../lib/auth';
import { formatCurrency, formatHours, formatPercent } from '../../lib/format';
import { cn } from '../../lib/utils';

function BurnBar({ consumed, hoursPaid }: { consumed: number; hoursPaid: number }) {
  const ratio = hoursPaid > 0 ? consumed / hoursPaid : 0;
  const color = ratio > 1 ? 'bg-coral' : ratio >= 0.9 ? 'bg-amber' : 'bg-success';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-border">
      <div className={cn('h-full', color)} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
    </div>
  );
}

function TeamTab({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const { data: employees } = useEmployees();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const addAssignment = useAddAssignment(projectId);
  const removeAssignment = useRemoveAssignment(projectId);
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState('');

  const assignedIds = new Set(project?.assignments?.map((a) => a.employeeId));
  const available = employees?.items.filter((e) => !assignedIds.has(e.id)) ?? [];

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!employeeId) return;
    addAssignment.mutate(
      { employeeId, roleOnProject: role || undefined },
      { onSuccess: () => { setEmployeeId(''); setRole(''); } },
    );
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <form onSubmit={handleAdd} className="flex items-end gap-3">
          <div className="w-56">
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Select employee...</option>
              {available.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <Input placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <Button type="submit" size="sm" disabled={!employeeId || addAssignment.isPending}>
            <UserPlus className="h-4 w-4" /> Add
          </Button>
        </form>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase text-muted">
            <th className="px-5 py-3 text-start font-medium">Employee</th>
            <th className="px-5 py-3 text-start font-medium">Role</th>
            {canEdit && <th className="px-5 py-3" />}
          </tr>
        </thead>
        <tbody>
          {(!project?.assignments || project.assignments.length === 0) && (
            <tr>
              <td colSpan={3} className="px-5 py-6 text-center text-muted">
                No team members yet.
              </td>
            </tr>
          )}
          {project?.assignments?.map((assignment) => (
            <tr key={assignment.id} className="border-b border-border last:border-0">
              <td className="px-5 py-3 font-medium">
                {assignment.employee.firstName} {assignment.employee.lastName}
              </td>
              <td className="px-5 py-3 text-muted">{assignment.roleOnProject || '—'}</td>
              {canEdit && (
                <td className="px-5 py-3 text-end">
                  <button
                    type="button"
                    onClick={() => removeAssignment.mutate(assignment.id)}
                    className="text-muted hover:text-coral"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canSeeMargin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const { data: project, isLoading } = useProject(id);
  const updateProject = useUpdateProject(id!);
  const deleteProject = useDeleteProject();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (isLoading || !project) {
    return <div className="text-sm text-muted">Loading...</div>;
  }

  const burn = project.burn ?? { hoursPaid: Number(project.hoursPaid), consumed: 0, remaining: Number(project.hoursPaid) };
  const margin = Number(project.incomeAmount);

  return (
    <div>
      <PageHeader
        title={`${project.name} (${project.code})`}
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

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Burn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <BurnBar consumed={burn.consumed} hoursPaid={burn.hoursPaid} />
            <div className="flex justify-between text-sm tabular-nums">
              <span>{formatHours(burn.consumed)} consumed</span>
              <span className="text-muted">{formatHours(burn.hoursPaid)} paid</span>
              <span className={burn.remaining < 0 ? 'text-coral' : 'text-success'}>
                {formatHours(burn.remaining)} remaining
              </span>
            </div>
            <p className="text-xs text-muted">
              {formatPercent(burn.hoursPaid > 0 ? burn.consumed / burn.hoursPaid : 0)} of paid hours consumed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Commercials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted">Income: </span>
              {formatCurrency(margin, project.currency)}
            </p>
            <p>
              <span className="text-muted">Billing type: </span>
              {project.billingType.replace(/_/g, ' ')}
            </p>
            <p>
              <span className="text-muted">Status: </span>
              <Badge status={project.status}>{project.status.replace('_', ' ')}</Badge>
            </p>
            {!canSeeMargin && <p className="text-xs text-muted">Cost & margin visible to Admin/Manager only.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <Tabs.Root defaultValue="team">
          <Tabs.List className="flex border-b border-border px-5">
            <Tabs.Trigger
              value="team"
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted data-[state=active]:border-charcoal data-[state=active]:text-charcoal"
            >
              Team
            </Tabs.Trigger>
            <Tabs.Trigger
              value="plan"
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted data-[state=active]:border-charcoal data-[state=active]:text-charcoal"
            >
              Plan
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="team" className="p-5">
            <TeamTab projectId={project.id} />
          </Tabs.Content>
          <Tabs.Content value="plan" className="p-10 text-center text-sm text-muted">
            Monthly allocation grid lands in Phase 2 (Monthly Planning).
          </Tabs.Content>
        </Tabs.Root>
      </Card>

      <ProjectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        project={project}
        isSubmitting={updateProject.isPending}
        onSubmit={(input) => updateProject.mutate(input, { onSuccess: () => setFormOpen(false) })}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete project"
        description={`Permanently delete "${project.name}"? This removes its team assignments and monthly allocations too. This cannot be undone.`}
        error={deleteError}
        isSubmitting={deleteProject.isPending}
        onConfirm={() =>
          deleteProject.mutate(project.id, {
            onSuccess: () => navigate('/projects'),
            onError: (err) =>
              setDeleteError(err instanceof ApiRequestError ? err.message : 'Failed to delete'),
          })
        }
      />
    </div>
  );
}
