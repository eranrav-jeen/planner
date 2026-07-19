import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ExternalLink, FileText, Github, KanbanSquare, Pencil, Trash2, Upload, UserPlus } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import {
  useAddAssignment,
  useDeleteProject,
  useDeletePo,
  useProject,
  useRemoveAssignment,
  useUpdateProject,
  useUploadPo,
} from '../../api/projects';
import { useEmployees } from '../../api/employees';
import type { Project } from '../../api/types';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input, Select } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { ErrorState } from '../../components/ui/error-state';
import { ProjectForm } from './ProjectForm';
import { useAuth, ApiRequestError } from '../../lib/auth';
import { useLanguage } from '../../lib/i18n';
import { formatCurrency, formatFileSize, formatHours, formatPercent, useDateFormatter } from '../../lib/format';
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
  const { t } = useLanguage();
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
              <option value="">{t('projects.selectEmployee')}</option>
              {available.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <Input placeholder={t('projects.role')} value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <Button type="submit" size="sm" disabled={!employeeId || addAssignment.isPending}>
            <UserPlus className="h-4 w-4" /> {t('projects.add')}
          </Button>
        </form>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase text-muted">
            <th className="px-5 py-3 text-start font-medium">{t('projects.colEmployee')}</th>
            <th className="px-5 py-3 text-start font-medium">{t('projects.colRole')}</th>
            {canEdit && <th className="px-5 py-3" />}
          </tr>
        </thead>
        <tbody>
          {(!project?.assignments || project.assignments.length === 0) && (
            <tr>
              <td colSpan={3} className="px-5 py-6 text-center text-muted">
                {t('projects.noTeamMembers')}
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

function PurchaseOrderCard({ project, canEdit }: { project: Project; canEdit: boolean }) {
  const { t } = useLanguage();
  const uploadPo = useUploadPo(project.id);
  const deletePo = useDeletePo(project.id);
  const formatDate = useDateFormatter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    uploadPo.mutate(file, {
      onError: (err) => setUploadError(err instanceof ApiRequestError ? err.message : t('projects.uploadFailed')),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('projects.purchaseOrder')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {project.poFileName ? (
          <>
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
              <div className="min-w-0">
                <div className="truncate font-medium">{project.poFileName}</div>
                <div className="text-xs text-muted">
                  {project.poFileSize != null && formatFileSize(project.poFileSize)}
                  {project.poUploadedAt &&
                    ` · ${t('projects.uploadedAt', { date: formatDate(project.poUploadedAt) })}`}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => (window.location.href = `/api/projects/${project.id}/po`)}
              >
                <Download className="h-3.5 w-3.5" /> {t('projects.download')}
              </Button>
              {canEdit && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" /> {t('projects.replace')}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => deletePo.mutate()}>
                    <Trash2 className="h-3.5 w-3.5" /> {t('projects.remove')}
                  </Button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-muted">{t('projects.noPo')}</p>
            {canEdit && (
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> {t('projects.uploadPo')}
              </Button>
            )}
          </>
        )}
        {canEdit && (
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />
        )}
        {uploadError && <p className="text-xs text-coral">{uploadError}</p>}
      </CardContent>
    </Card>
  );
}

function LinksCard({ project }: { project: Project }) {
  const { t } = useLanguage();
  const hasLinks = project.githubRepoUrl || project.jiraBoardUrl;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('projects.links')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {!hasLinks && <p className="text-muted">{t('projects.noLinks')}</p>}
        {project.githubRepoUrl && (
          <a
            href={project.githubRepoUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-charcoal hover:underline"
          >
            <Github className="h-4 w-4 shrink-0 text-muted" />
            <span className="truncate">{t('projects.githubRepo')}</span>
            <ExternalLink className="h-3 w-3 shrink-0 text-muted" />
          </a>
        )}
        {project.jiraBoardUrl && (
          <a
            href={project.jiraBoardUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-charcoal hover:underline"
          >
            <KanbanSquare className="h-4 w-4 shrink-0 text-muted" />
            <span className="truncate">{t('projects.jiraBoard')}</span>
            <ExternalLink className="h-3 w-3 shrink-0 text-muted" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canSeeMargin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const { data: project, isLoading, isError, refetch } = useProject(id);
  const updateProject = useUpdateProject(id!);
  const deleteProject = useDeleteProject();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (isLoading) {
    return <div className="text-sm text-muted">{t('common.loading')}</div>;
  }
  if (isError || !project) {
    return <ErrorState message={t('projects.couldNotLoad')} onRetry={refetch} />;
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
                <Pencil className="h-4 w-4" /> {t('common.edit')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" /> {t('common.delete')}
              </Button>
            </div>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('projects.burn')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <BurnBar consumed={burn.consumed} hoursPaid={burn.hoursPaid} />
            <div className="flex justify-between text-sm tabular-nums">
              <span>
                {formatHours(burn.consumed)} {t('projects.consumed')}
              </span>
              <span className="text-muted">
                {formatHours(burn.hoursPaid)} {t('projects.paid')}
              </span>
              <span className={burn.remaining < 0 ? 'text-coral' : 'text-success'}>
                {formatHours(burn.remaining)} {t('projects.remaining')}
              </span>
            </div>
            <p className="text-xs text-muted">
              {t('projects.percentConsumed', {
                percent: formatPercent(burn.hoursPaid > 0 ? burn.consumed / burn.hoursPaid : 0),
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('projects.commercials')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted">{t('projects.income')}: </span>
              {formatCurrency(margin, project.currency)}
            </p>
            <p>
              <span className="text-muted">{t('projects.billingType')}: </span>
              {t(`billing.${project.billingType}`)}
            </p>
            <p>
              <span className="text-muted">{t('projects.status')}: </span>
              <Badge status={project.status}>{t(`status.${project.status}`)}</Badge>
            </p>
            {!canSeeMargin && <p className="text-xs text-muted">{t('projects.marginHidden')}</p>}
          </CardContent>
        </Card>
        <PurchaseOrderCard project={project} canEdit={canEdit} />
        <LinksCard project={project} />
      </div>

      <Card>
        <Tabs.Root defaultValue="team">
          <Tabs.List className="flex border-b border-border px-5">
            <Tabs.Trigger
              value="team"
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted data-[state=active]:border-charcoal data-[state=active]:text-charcoal"
            >
              {t('projects.team')}
            </Tabs.Trigger>
            <Tabs.Trigger
              value="plan"
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted data-[state=active]:border-charcoal data-[state=active]:text-charcoal"
            >
              {t('projects.plan')}
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="team" className="p-5">
            <TeamTab projectId={project.id} />
          </Tabs.Content>
          <Tabs.Content value="plan" className="p-10 text-center text-sm text-muted">
            {t('projects.planComingSoon')}
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
        title={t('projects.deleteTitle')}
        description={t('projects.deleteDescription', { name: project.name })}
        error={deleteError}
        isSubmitting={deleteProject.isPending}
        onConfirm={() =>
          deleteProject.mutate(project.id, {
            onSuccess: () => navigate('/projects'),
            onError: (err) =>
              setDeleteError(err instanceof ApiRequestError ? err.message : t('common.failedToDelete')),
          })
        }
      />
    </div>
  );
}
