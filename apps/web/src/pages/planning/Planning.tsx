import { useEffect, useMemo, useState } from 'react';
import { Copy, Minus, Plus, Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/input';
import { useEmployees } from '../../api/employees';
import { useProjects } from '../../api/projects';
import { useAssignments } from '../../api/assignments';
import { useAllocations, useBulkUpsertAllocations, useCopyForwardAllocations } from '../../api/allocations';
import { useCapacityOverrides } from '../../api/capacityOverrides';
import { useLanguage } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { addMonthsToKey, currentMonthKey, monthRange, monthShortLabel } from '../../lib/months';
import { cellKey, type InputMode } from './gridUtils';
import { EmployeePivot } from './EmployeePivot';
import { ProjectPivot } from './ProjectPivot';
import { CustomerPivot } from './CustomerPivot';
import { ErrorState } from '../../components/ui/error-state';
import { ExportButton } from '../reports/ExportButton';
import { cn } from '../../lib/utils';

const DEFAULT_WINDOW_SIZE = 7;

export function Planning() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [pivot, setPivot] = useState<'employee' | 'project' | 'customer'>('employee');
  const [inputMode, setInputMode] = useState<InputMode>('hours');
  const [windowStart, setWindowStart] = useState(currentMonthKey());
  const [windowSize, setWindowSize] = useState(DEFAULT_WINDOW_SIZE);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [edited, setEdited] = useState<Map<string, number>>(new Map());
  const [copySourceMonth, setCopySourceMonth] = useState(currentMonthKey());
  const [copyTargetCount, setCopyTargetCount] = useState(3);

  const months = useMemo(() => monthRange(windowStart, windowSize), [windowStart, windowSize]);
  const from = months[0];
  const to = months[months.length - 1];

  const { data: employeesData } = useEmployees({ isActive: 'true' });
  const { data: projectsData } = useProjects({});
  const employees = employeesData?.items ?? [];
  const projects = projectsData?.items ?? [];

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const projectFilter = pivot === 'project' ? selectedProjectId : undefined;
  const { data: allocations = [], isError: allocationsError, refetch: refetchAllocations } = useAllocations(from, to, {
    projectId: projectFilter,
  });
  const { data: overrides = [] } = useCapacityOverrides(from, to);
  const { data: allAssignments = [] } = useAssignments(pivot === 'project' ? { projectId: selectedProjectId } : {});

  const bulkUpsert = useBulkUpsertAllocations();
  const copyForward = useCopyForwardAllocations();

  useEffect(() => {
    setEdited(new Map());
  }, [pivot, selectedProjectId, from, to]);

  function handleChange(employeeId: string, projectId: string, monthKey: string, value: number) {
    setEdited((prev) => {
      const next = new Map(prev);
      next.set(cellKey(employeeId, projectId, monthKey), Math.max(0, value));
      return next;
    });
  }

  async function handleSave() {
    const items = Array.from(edited.entries()).map(([key, plannedHours]) => {
      const [employeeId, projectId, month] = key.split('|');
      return { employeeId, projectId, month, plannedHours };
    });
    if (items.length === 0) return;
    await bulkUpsert.mutateAsync(items);
    setEdited(new Map());
  }

  async function handleCopyForward() {
    const toMonths = monthRange(addMonthsToKey(copySourceMonth, 1), copyTargetCount);
    await copyForward.mutateAsync({
      fromMonth: copySourceMonth,
      toMonths,
      projectId: pivot === 'project' ? selectedProjectId : undefined,
    });
  }

  return (
    <div>
      <PageHeader
        title="Planning"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              report="planning"
              formats={['xlsx']}
              params={{
                from,
                to,
                pivot,
                projectId: pivot === 'project' ? selectedProjectId : undefined,
              }}
            />
            {canEdit && (
              <Button onClick={handleSave} disabled={edited.size === 0 || bulkUpsert.isPending}>
                <Save className="h-4 w-4" /> Save {edited.size > 0 && `(${edited.size})`}
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setPivot('employee')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              pivot === 'employee' ? 'bg-charcoal text-white' : 'text-charcoal/70 hover:bg-bg',
            )}
          >
            By employee
          </button>
          <button
            type="button"
            onClick={() => setPivot('project')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              pivot === 'project' ? 'bg-charcoal text-white' : 'text-charcoal/70 hover:bg-bg',
            )}
          >
            By project
          </button>
          <button
            type="button"
            onClick={() => setPivot('customer')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              pivot === 'customer' ? 'bg-charcoal text-white' : 'text-charcoal/70 hover:bg-bg',
            )}
          >
            By customer
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setInputMode('hours')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              inputMode === 'hours' ? 'bg-charcoal text-white' : 'text-charcoal/70 hover:bg-bg',
            )}
          >
            Hours
          </button>
          <button
            type="button"
            onClick={() => setInputMode('percent')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              inputMode === 'percent' ? 'bg-charcoal text-white' : 'text-charcoal/70 hover:bg-bg',
            )}
          >
            %
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {pivot === 'project' && (
            <Select
              className="w-56"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </Select>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">Window:</span>
            <button
              type="button"
              onClick={() => setWindowStart((s) => addMonthsToKey(s, -1))}
              className="rounded-md border border-border p-1.5 hover:bg-bg"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-32 text-center text-sm font-medium tabular-nums">
              {monthShortLabel(from, language)} – {monthShortLabel(to, language)}
            </span>
            <button
              type="button"
              onClick={() => setWindowStart((s) => addMonthsToKey(s, 1))}
              className="rounded-md border border-border p-1.5 hover:bg-bg"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <Select
              className="w-24"
              value={windowSize}
              onChange={(e) => setWindowSize(Number(e.target.value))}
            >
              {[3, 6, 7, 9, 12].map((n) => (
                <option key={n} value={n}>
                  {n} months
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <Card className="overflow-x-auto">
        {allocationsError ? (
          <ErrorState message="Couldn't load the planning grid." onRetry={refetchAllocations} />
        ) : pivot === 'employee' ? (
          <EmployeePivot
            employees={employees}
            months={months}
            assignments={allAssignments}
            allocations={allocations}
            overrides={overrides}
            edited={edited}
            onChange={handleChange}
            language={language}
            canEdit={canEdit}
            inputMode={inputMode}
          />
        ) : pivot === 'customer' ? (
          <CustomerPivot
            employees={employees}
            months={months}
            assignments={allAssignments}
            allocations={allocations}
            overrides={overrides}
            edited={edited}
            language={language}
            inputMode={inputMode}
          />
        ) : (
          <ProjectPivot
            projectId={selectedProjectId}
            assignments={allAssignments}
            months={months}
            allocations={allocations}
            overrides={overrides}
            edited={edited}
            onChange={handleChange}
            language={language}
            canEdit={canEdit}
            inputMode={inputMode}
          />
        )}
      </Card>

      {canEdit && (
        <Card className="mt-4">
          <div className="flex flex-wrap items-end gap-3 p-4">
            <span className="text-sm font-medium text-charcoal">Copy-forward:</span>
            <Select
              className="w-40"
              value={copySourceMonth}
              onChange={(e) => setCopySourceMonth(e.target.value)}
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthShortLabel(m, language)}
                </option>
              ))}
            </Select>
            <span className="text-sm text-muted">to next</span>
            <input
              type="number"
              min={1}
              max={12}
              value={copyTargetCount}
              onChange={(e) => setCopyTargetCount(Number(e.target.value))}
              className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-center text-sm outline-none focus:border-charcoal"
            />
            <span className="text-sm text-muted">months</span>
            <Button variant="secondary" size="sm" onClick={handleCopyForward} disabled={copyForward.isPending}>
              <Copy className="h-4 w-4" /> Apply
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
