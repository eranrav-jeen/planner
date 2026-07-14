import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useCreateProject, useProjects, useDeleteProject } from '../../api/projects';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input, Select } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { TableStatusRow } from '../../components/ui/table-status-row';
import { Pagination } from '../../components/ui/pagination';
import { ProjectForm } from './ProjectForm';
import { useAuth, ApiRequestError } from '../../lib/auth';
import { formatCurrency, formatHours } from '../../lib/format';
import type { Project } from '../../api/types';

export function ProjectsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useProjects({
    search,
    status: status || undefined,
    page: String(page),
  });
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    deleteProject.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (err) => setDeleteError(err instanceof ApiRequestError ? err.message : 'Failed to delete'),
    });
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        actions={
          canEdit && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> New project
            </Button>
          )
        }
      />
      <div className="mb-4 flex gap-3">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search projects..."
            className="ps-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-44"
        >
          <option value="">All statuses</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="on_hold">On hold</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="px-5 py-3 text-start font-medium">Project</th>
              <th className="px-5 py-3 text-start font-medium">Customer</th>
              <th className="px-5 py-3 text-start font-medium">Status</th>
              <th className="px-5 py-3 text-start font-medium">Income</th>
              <th className="px-5 py-3 text-start font-medium">Hours paid</th>
              {canEdit && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody>
            <TableStatusRow
              colSpan={6}
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && data?.items.length === 0}
              emptyMessage="No projects yet."
              onRetry={refetch}
            />
            {data?.items.map((project) => (
              <tr
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-bg"
              >
                <td className="px-5 py-3 font-medium">
                  {project.name} <span className="text-muted">({project.code})</span>
                </td>
                <td className="px-5 py-3 text-muted">{project.customer?.name}</td>
                <td className="px-5 py-3">
                  <Badge status={project.status}>{project.status.replace('_', ' ')}</Badge>
                </td>
                <td className="px-5 py-3 tabular-nums">
                  {formatCurrency(Number(project.incomeAmount), project.currency)}
                </td>
                <td className="px-5 py-3 tabular-nums">{formatHours(Number(project.hoursPaid))}</td>
                {canEdit && (
                  <td className="px-5 py-3 text-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteError(null);
                        setDeleteTarget(project);
                      }}
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
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}
      </Card>
      <ProjectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        isSubmitting={createProject.isPending}
        onSubmit={(input) => createProject.mutate(input, { onSuccess: () => setFormOpen(false) })}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete project"
        description={`Permanently delete "${deleteTarget?.name}"? This removes its team assignments and monthly allocations too. This cannot be undone.`}
        error={deleteError}
        isSubmitting={deleteProject.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
