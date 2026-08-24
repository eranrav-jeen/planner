import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEmployees } from '../../api/employees';
import {
  useCreateMilestone,
  useDeleteMilestone,
  useMilestones,
  useUpdateMilestone,
  type Milestone,
  type MilestoneInput,
  type MilestoneLineInput,
  type WorkType,
} from '../../api/milestones';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Dialog } from '../../components/ui/dialog';
import { Field, Input, Select } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { ErrorState } from '../../components/ui/error-state';
import { useAuth, ApiRequestError } from '../../lib/auth';
import { useLanguage } from '../../lib/i18n';
import { formatHours, useDateFormatter } from '../../lib/format';

const WORK_TYPES: WorkType[] = [
  'specification',
  'design',
  'development',
  'testing',
  'research',
  'training_materials',
  'project_management',
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

function durationWeeks(startISO: string, endISO: string): number {
  const days = (Date.parse(endISO) - Date.parse(startISO)) / 86_400_000 + 1; // inclusive
  return Math.max(1, Math.round(days / 7));
}

export function MilestonesTab({ projectId }: { projectId: string }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const formatDate = useDateFormatter();
  const { data, isLoading, isError, refetch } = useMilestones(projectId);
  const createM = useCreateMilestone(projectId);
  const updateM = useUpdateMilestone(projectId);
  const deleteM = useDeleteMilestone(projectId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Milestone | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-muted">{t('common.loading')}</p>;
  if (isError || !data) return <ErrorState onRetry={refetch} />;

  const milestones = data.milestones;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">{t('milestones.drivesPlan')}</p>
        {canEdit && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> {t('milestones.add')}
          </Button>
        )}
      </div>

      {milestones.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t('milestones.none')}</p>
      ) : (
        <div className="space-y-3">
          {milestones.map((m, i) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-semibold text-charcoal">
                    {i + 1}. {m.name}
                  </h4>
                  <p className="text-xs text-muted">
                    {formatDate(m.startDate)} – {formatDate(m.endDate)}
                    {` · ${durationWeeks(m.startDate, m.endDate)} ${t('milestones.week')}`}
                    {` · ${formatHours(m.totalHours)}`}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={t('common.edit')}
                      title={t('common.edit')}
                      onClick={() => {
                        setEditing(m);
                        setFormOpen(true);
                      }}
                      className="rounded p-1 text-muted hover:bg-bg"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t('common.delete')}
                      title={t('common.delete')}
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(m);
                      }}
                      className="rounded p-1 text-muted hover:text-coral"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {m.lines.length === 0 ? (
                <p className="mt-2 text-xs text-muted">{t('milestones.noLines')}</p>
              ) : (
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted">
                      <th className="py-2 text-start font-medium">{t('milestones.colProfessional')}</th>
                      <th className="py-2 text-start font-medium">{t('milestones.colWorkType')}</th>
                      <th className="py-2 text-end font-medium">{t('milestones.colEffort')}</th>
                      <th className="py-2 text-end font-medium">{t('milestones.colHours')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.lines.map((line) => (
                      <tr key={line.id} className="border-b border-border last:border-0">
                        <td className="py-2">{line.employeeName}</td>
                        <td className="py-2 text-muted">{t(`workType.${line.workType}`)}</td>
                        <td className="py-2 text-end tabular-nums">{line.effortPct}%</td>
                        <td className="py-2 text-end tabular-nums">{formatHours(line.hours)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          ))}
        </div>
      )}

      {formOpen && (
        <MilestoneForm
          milestone={editing}
          isSubmitting={createM.isPending || updateM.isPending}
          onClose={() => setFormOpen(false)}
          onSubmit={(input) => {
            const opts = { onSuccess: () => setFormOpen(false) };
            if (editing) updateM.mutate({ id: editing.id, input }, opts);
            else createM.mutate(input, opts);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('milestones.deleteTitle')}
        description={t('milestones.deleteDescription', { name: deleteTarget?.name ?? '' })}
        error={deleteError}
        isSubmitting={deleteM.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          setDeleteError(null);
          deleteM.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
            onError: (err) =>
              setDeleteError(err instanceof ApiRequestError ? err.message : t('common.failedToDelete')),
          });
        }}
      />
    </div>
  );
}

function MilestoneForm({
  milestone,
  onSubmit,
  onClose,
  isSubmitting,
}: {
  milestone: Milestone | null;
  onSubmit: (input: MilestoneInput) => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  const { t } = useLanguage();
  const { data: employees } = useEmployees();
  const [name, setName] = useState(milestone?.name ?? '');
  const [startDate, setStartDate] = useState(milestone?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(milestone?.endDate ?? addDaysISO(todayISO(), 27));
  const [lines, setLines] = useState<MilestoneLineInput[]>(
    milestone?.lines.map((l) => ({ employeeId: l.employeeId, workType: l.workType, effortPct: l.effortPct })) ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  function updateLine(index: number, patch: Partial<MilestoneLineInput>) {
    setLines(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (endDate < startDate) {
      setError(t('milestones.invalidDates'));
      return;
    }
    if (lines.some((l) => !l.employeeId)) {
      setError(t('milestones.lineNeedsEmployee'));
      return;
    }
    onSubmit({ name, startDate, endDate, lines });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={milestone ? t('milestones.editTitle') : t('milestones.newTitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('milestones.nameLabel')}>
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('milestones.startDate')}>
            <Input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label={t('milestones.endDate')}>
            <Input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-charcoal">{t('milestones.professionals')}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setLines([...lines, { employeeId: '', workType: 'development', effortPct: 100 }])}
            >
              <Plus className="h-3.5 w-3.5" /> {t('milestones.addLine')}
            </Button>
          </div>
          <p className="mb-2 text-xs text-muted">{t('milestones.effortPct')}</p>
          {lines.length === 0 ? (
            <p className="text-xs text-muted">{t('milestones.noLines')}</p>
          ) : (
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    className="flex-1"
                    value={line.employeeId}
                    onChange={(e) => updateLine(i, { employeeId: e.target.value })}
                  >
                    <option value="">{t('milestones.selectEmployee')}</option>
                    {employees?.items.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </Select>
                  <Select
                    className="w-36"
                    value={line.workType}
                    onChange={(e) => updateLine(i, { workType: e.target.value as WorkType })}
                  >
                    {WORK_TYPES.map((wt) => (
                      <option key={wt} value={wt}>
                        {t(`workType.${wt}`)}
                      </option>
                    ))}
                  </Select>
                  <Input
                    className="w-20"
                    type="number"
                    min={1}
                    max={100}
                    step={0.5}
                    value={line.effortPct}
                    onChange={(e) => updateLine(i, { effortPct: Number(e.target.value) })}
                  />
                  <button
                    type="button"
                    aria-label={t('common.delete')}
                    onClick={() => setLines(lines.filter((_, idx) => idx !== i))}
                    className="text-muted hover:text-coral"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-coral">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
