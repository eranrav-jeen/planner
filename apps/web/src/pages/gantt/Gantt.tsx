import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gantt, ViewMode, type Task } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Select } from '../../components/ui/input';
import { useCustomers } from '../../api/customers';
import { useGanttProjects, type GanttProjectRow } from '../../api/gantt';
import { useLanguage } from '../../lib/i18n';
import { ExportButton } from '../reports/ExportButton';
import { GanttTooltip } from './GanttTooltip';
import { STATUS_BAR_COLORS } from './statusColors';

const CUSTOMER_PREFIX = 'customer:';
const FALLBACK_SPAN_DAYS = 30;

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function GanttPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { data: customersData } = useCustomers();
  const { data, isLoading } = useGanttProjects(customerId || undefined);

  const rowsById = useMemo(() => {
    const map = new Map<string, GanttProjectRow>();
    for (const row of data?.rows ?? []) map.set(row.id, row);
    return map;
  }, [data]);

  const tasks = useMemo<Task[]>(() => {
    const rows = (data?.rows ?? []).filter((r) => r.startDate || r.endDate);
    const byCustomer = new Map<string, { name: string; rows: GanttProjectRow[] }>();
    for (const row of rows) {
      const group = byCustomer.get(row.customerId) ?? { name: row.customerName, rows: [] };
      group.rows.push(row);
      byCustomer.set(row.customerId, group);
    }

    const result: Task[] = [];
    const sortedCustomers = Array.from(byCustomer.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name));

    for (const [custId, group] of sortedCustomers) {
      const spans = group.rows.map((row) => {
        const start = row.startDate ? new Date(row.startDate) : addDays(new Date(row.endDate!), -FALLBACK_SPAN_DAYS);
        const end = row.endDate ? new Date(row.endDate) : addDays(new Date(row.startDate!), FALLBACK_SPAN_DAYS);
        return { row, start, end };
      });

      const groupStart = new Date(Math.min(...spans.map((s) => s.start.getTime())));
      const groupEnd = new Date(Math.max(...spans.map((s) => s.end.getTime())));
      const avgProgress = spans.reduce((sum, s) => sum + s.row.percentComplete, 0) / spans.length;
      const parentId = `${CUSTOMER_PREFIX}${custId}`;

      result.push({
        id: parentId,
        type: 'project',
        name: group.name,
        start: groupStart,
        end: groupEnd,
        progress: Math.round(avgProgress * 100),
        hideChildren: collapsed.has(custId),
        styles: { backgroundColor: '#232122', progressColor: '#6B7280' },
      });

      for (const { row, start, end } of spans) {
        const colors = STATUS_BAR_COLORS[row.status] ?? STATUS_BAR_COLORS.planning;
        result.push({
          id: row.id,
          type: 'task',
          name: `${row.name} (${row.code})`,
          start,
          end,
          progress: Math.round(row.percentComplete * 100),
          project: parentId,
          isDisabled: true,
          styles: { backgroundColor: colors.background, progressColor: colors.progress },
        });
      }
    }

    return result;
  }, [data, collapsed]);

  function handleExpanderClick(task: Task) {
    if (!task.id.startsWith(CUSTOMER_PREFIX)) return;
    const custId = task.id.slice(CUSTOMER_PREFIX.length);
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(custId)) next.delete(custId);
      else next.add(custId);
      return next;
    });
  }

  function handleClick(task: Task) {
    if (task.type === 'task') navigate(`/projects/${task.id}`);
  }

  return (
    <div>
      <PageHeader title="Gantt" actions={<ExportButton />} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select className="w-56" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">All customers</option>
          {customersData?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          {[
            { label: 'Week', mode: ViewMode.Week },
            { label: 'Month', mode: ViewMode.Month },
            { label: 'Quarter', mode: ViewMode.Year },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setViewMode(option.mode)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                viewMode === option.mode ? 'bg-charcoal text-white' : 'text-charcoal/70 hover:bg-bg'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-x-auto p-2">
        {isLoading && <div className="p-10 text-center text-sm text-muted">Loading...</div>}
        {!isLoading && tasks.length === 0 && (
          <div className="p-10 text-center text-sm text-muted">No projects with dates to display.</div>
        )}
        {!isLoading && tasks.length > 0 && (
          <div dir="ltr">
            <Gantt
              tasks={tasks}
              viewMode={viewMode}
              onClick={handleClick}
              onExpanderClick={handleExpanderClick}
              listCellWidth="200px"
              columnWidth={viewMode === ViewMode.Week ? 100 : viewMode === ViewMode.Month ? 60 : 250}
              barCornerRadius={4}
              fontFamily={language === 'he' ? 'Heebo, Inter, sans-serif' : 'Inter, Heebo, sans-serif'}
              TooltipContent={(props) => <GanttTooltip {...props} rowsById={rowsById} />}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
