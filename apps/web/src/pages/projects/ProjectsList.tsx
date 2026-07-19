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
import { useLanguage } from '../../lib/i18n';
import { formatCurrency, formatHours } from '../../lib/format';
import type { Project } from '../../api/types';

export function ProjectsList() {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
      onError: (err) => setDeleteError(err instanceof ApiRequestError ? err.message : t('common.failedToDelete')),
    });
  }

  return (
    <div>
      <PageHeader
        title={t('projects.title')}
        actions={
          canEdit && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> {t('projects.newProject')}
            </Button>
          )
        }
      />
      <div className="mb-4 flex gap-3">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder={t('projects.searchPlaceholder')}
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
          <option value="">{t('status.allStatuses')}</option>
          <option value="planning">{t('status.planning')}</option>
          <option value="active">{t('status.active')}</option>
          <option value="on_hold">{t('status.on_hold')}</option>
          <option value="completed">{t('status.completed')}</option>
          <option value="cancelled">{t('status.cancelled')}</option>
        </Select>
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="px-5 py-3 text-start font-medium">{t('projects.colProject')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('projects.colCustomer')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('projects.colStatus')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('projects.colIncome')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('projects.colHoursPaid')}</th>
              {canEdit && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody>
            <TableStatusRow
              colSpan={6}
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && data?.items.length === 0}
              emptyMessage={t('projects.none')}
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
                  <Badge status={project.status}>{t(`status.${project.status}`)}</Badge>
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
        title={t('projects.deleteTitle')}
        description={t('projects.deleteDescription', { name: deleteTarget?.name ?? '' })}
        error={deleteError}
        isSubmitting={deleteProject.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
