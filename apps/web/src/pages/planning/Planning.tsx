import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Select } from '../../components/ui/input';
import { useEmployees } from '../../api/employees';
import { useProjects } from '../../api/projects';
import { useAssignments } from '../../api/assignments';
import { useAllocations } from '../../api/allocations';
import { useCapacityOverrides } from '../../api/capacityOverrides';
import { useLanguage } from '../../lib/i18n';
import { addMonthsToKey, currentMonthKey, monthRange, monthShortLabel } from '../../lib/months';
import type { InputMode } from './gridUtils';
import { EmployeePivot } from './EmployeePivot';
import { ProjectPivot } from './ProjectPivot';
import { CustomerPivot } from './CustomerPivot';
import { ErrorState } from '../../components/ui/error-state';
import { ExportButton } from '../reports/ExportButton';
import { cn } from '../../lib/utils';

const DEFAULT_WINDOW_SIZE = 7;

export function Planning() {
  const { language, t } = useLanguage();

  const [pivot, setPivot] = useState<'employee' | 'project' | 'customer'>('employee');
  const [inputMode, setInputMode] = useState<InputMode>('hours');
  const [windowStart, setWindowStart] = useState(currentMonthKey());
  const [windowSize, setWindowSize] = useState(DEFAULT_WINDOW_SIZE);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

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

  return (
    <div>
      <PageHeader
        title={t('planning.title')}
        actions={
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
        }
      />

      <p className="mb-4 text-sm text-muted">{t('planning.readOnlyNote')}</p>

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
            {t('planning.byEmployee')}
          </button>
          <button
            type="button"
            onClick={() => setPivot('project')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              pivot === 'project' ? 'bg-charcoal text-white' : 'text-charcoal/70 hover:bg-bg',
            )}
          >
            {t('planning.byProject')}
          </button>
          <button
            type="button"
            onClick={() => setPivot('customer')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              pivot === 'customer' ? 'bg-charcoal text-white' : 'text-charcoal/70 hover:bg-bg',
            )}
          >
            {t('planning.byCustomer')}
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
            {t('planning.hours')}
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
            <Select className="w-56" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </Select>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">{t('planning.window')}</span>
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
            <Select className="w-24" value={windowSize} onChange={(e) => setWindowSize(Number(e.target.value))}>
              {[3, 6, 7, 9, 12].map((n) => (
                <option key={n} value={n}>
                  {t('planning.months', { n })}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="mb-2 flex items-center gap-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-charcoal" /> {t('planning.planned')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-muted" /> {t('planning.actual')}
        </span>
      </div>

      <Card className="overflow-x-auto">
        {allocationsError ? (
          <ErrorState message={t('planning.couldNotLoad')} onRetry={refetchAllocations} />
        ) : pivot === 'employee' ? (
          <EmployeePivot
            employees={employees}
            months={months}
            assignments={allAssignments}
            allocations={allocations}
            overrides={overrides}
            language={language}
            inputMode={inputMode}
          />
        ) : pivot === 'customer' ? (
          <CustomerPivot
            employees={employees}
            months={months}
            assignments={allAssignments}
            allocations={allocations}
            overrides={overrides}
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
            language={language}
            inputMode={inputMode}
          />
        )}
      </Card>
    </div>
  );
}
