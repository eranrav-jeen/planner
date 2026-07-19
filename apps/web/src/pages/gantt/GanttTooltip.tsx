import type { Task } from 'gantt-task-react';
import { Badge } from '../../components/ui/badge';
import { formatCurrency, formatPercent } from '../../lib/format';
import { useLanguage } from '../../lib/i18n';
import type { GanttProjectRow } from '../../api/gantt';

export function GanttTooltip({
  task,
  rowsById,
}: {
  task: Task;
  fontSize: string;
  fontFamily: string;
  rowsById: Map<string, GanttProjectRow>;
}) {
  const { t } = useLanguage();

  if (task.type === 'project') {
    return (
      <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-card">
        <div className="font-medium text-charcoal">{task.name}</div>
        <div className="text-xs text-muted">{t('gantt.customerGroup')}</div>
      </div>
    );
  }

  const row = rowsById.get(task.id);
  if (!row) return null;

  return (
    <div className="min-w-56 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm shadow-card">
      <div className="mb-1 font-medium text-charcoal">
        {row.name} <span className="text-muted">({row.code})</span>
      </div>
      <div className="mb-1.5">
        <Badge status={row.status}>{t(`status.${row.status}`)}</Badge>
      </div>
      <div className="space-y-0.5 text-xs text-muted">
        <div>
          {t('gantt.customer')}: {row.customerName}
        </div>
        <div>
          {row.startDate?.slice(0, 10) ?? '—'} → {row.endDate?.slice(0, 10) ?? '—'}
        </div>
        <div>
          {t('gantt.income')}: {formatCurrency(row.incomeAmount, row.currency)}
        </div>
        <div>
          {t('gantt.hours')}: {row.consumed} / {row.hoursPaid} ({formatPercent(row.percentComplete)})
        </div>
      </div>
    </div>
  );
}
