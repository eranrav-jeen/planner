import { useMemo } from 'react';
import type { AssignmentRow } from '../../api/assignments';
import type { MonthlyAllocation } from '../../api/allocations';
import type { CapacityOverride } from '../../api/capacityOverrides';
import { cellKey, hoursToPercent, percentToHours, roundHours, type InputMode } from './gridUtils';
import { monthShortLabel } from '../../lib/months';
import { useLanguage } from '../../lib/i18n';

export function ProjectPivot({
  projectId,
  assignments,
  months,
  allocations,
  overrides,
  edited,
  onChange,
  language,
  canEdit,
  inputMode,
}: {
  projectId: string;
  assignments: AssignmentRow[];
  months: string[];
  allocations: MonthlyAllocation[];
  overrides: CapacityOverride[];
  edited: Map<string, number>;
  onChange: (employeeId: string, projectId: string, monthKey: string, value: number) => void;
  language: 'he' | 'en';
  canEdit: boolean;
  inputMode: InputMode;
}) {
  const { t } = useLanguage();
  const allocationMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of allocations) {
      map.set(cellKey(a.employeeId, a.projectId, a.month.slice(0, 7)), Number(a.plannedHours));
    }
    return map;
  }, [allocations]);

  const overrideMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of overrides) {
      map.set(`${o.employeeId}|${o.month.slice(0, 7)}`, Number(o.capacityHours));
    }
    return map;
  }, [overrides]);

  function getValue(employeeId: string, monthKey: string): number {
    const key = cellKey(employeeId, projectId, monthKey);
    return roundHours(edited.get(key) ?? allocationMap.get(key) ?? 0);
  }

  function capacityFor(assignment: AssignmentRow, monthKey: string): number {
    return overrideMap.get(`${assignment.employeeId}|${monthKey}`) ?? assignment.employee.monthlyCapacityHours;
  }

  const totalsByMonth = months.map((m) =>
    roundHours(assignments.reduce((sum, a) => sum + getValue(a.employeeId, m), 0)),
  );

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-xs uppercase text-muted">
          <th className="px-5 py-3 text-start font-medium">{t('planning.colEmployee')}</th>
          {months.map((m) => (
            <th key={m} className="px-3 py-3 text-center font-medium">
              {monthShortLabel(m, language)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {assignments.length === 0 && (
          <tr>
            <td colSpan={months.length + 1} className="px-5 py-6 text-center text-muted">
              {t('planning.noTeamMembers')}
            </td>
          </tr>
        )}
        {assignments.map((a) => (
          <tr key={a.id} className="border-b border-border last:border-0">
            <td className="px-5 py-2.5 font-medium">
              {a.employee.firstName} {a.employee.lastName}
              {a.roleOnProject && <span className="ms-1.5 text-xs text-muted">({a.roleOnProject})</span>}
            </td>
            {months.map((m) => {
              const hours = getValue(a.employeeId, m);
              const capacity = capacityFor(a, m);
              const displayValue =
                inputMode === 'percent' ? Math.round(hoursToPercent(hours, capacity) * 10) / 10 : hours;
              return (
                <td key={m} className="px-1 py-1 text-center">
                  {canEdit ? (
                    <input
                      type="number"
                      min={0}
                      className="w-16 rounded-md border border-transparent bg-transparent px-1 py-1 text-center tabular-nums outline-none hover:border-border focus:border-charcoal focus:bg-surface"
                      value={displayValue}
                      onChange={(e) => {
                        const raw = Number(e.target.value);
                        const newHours = inputMode === 'percent' ? percentToHours(raw, capacity) : raw;
                        onChange(a.employeeId, projectId, m, newHours);
                      }}
                    />
                  ) : (
                    <span className="tabular-nums">
                      {displayValue}
                      {inputMode === 'percent' ? '%' : 'h'}
                    </span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-charcoal/20 font-semibold">
          <td className="px-5 py-3">{t('planning.total')}</td>
          {totalsByMonth.map((total, i) => (
            <td key={months[i]} className="px-3 py-3 text-center tabular-nums">
              {total}h
            </td>
          ))}
        </tr>
      </tfoot>
    </table>
  );
}
