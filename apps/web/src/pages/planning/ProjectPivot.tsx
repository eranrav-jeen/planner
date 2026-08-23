import { useMemo } from 'react';
import type { AssignmentRow } from '../../api/assignments';
import type { MonthlyAllocation } from '../../api/allocations';
import type { CapacityOverride } from '../../api/capacityOverrides';
import { cellKey, hoursToPercent, roundHours, type InputMode } from './gridUtils';
import { monthShortLabel } from '../../lib/months';
import { useLanguage } from '../../lib/i18n';

export function ProjectPivot({
  projectId,
  assignments,
  months,
  allocations,
  overrides,
  language,
  inputMode,
}: {
  projectId: string;
  assignments: AssignmentRow[];
  months: string[];
  allocations: MonthlyAllocation[];
  overrides: CapacityOverride[];
  language: 'he' | 'en';
  inputMode: InputMode;
}) {
  const { t } = useLanguage();

  const plannedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of allocations) map.set(cellKey(a.employeeId, a.projectId, a.month.slice(0, 7)), Number(a.plannedHours));
    return map;
  }, [allocations]);

  const actualMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of allocations) {
      if (a.actualHours != null) map.set(cellKey(a.employeeId, a.projectId, a.month.slice(0, 7)), Number(a.actualHours));
    }
    return map;
  }, [allocations]);

  const overrideMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of overrides) map.set(`${o.employeeId}|${o.month.slice(0, 7)}`, Number(o.capacityHours));
    return map;
  }, [overrides]);

  const planned = (employeeId: string, monthKey: string) =>
    roundHours(plannedMap.get(cellKey(employeeId, projectId, monthKey)) ?? 0);
  const actual = (employeeId: string, monthKey: string) =>
    roundHours(actualMap.get(cellKey(employeeId, projectId, monthKey)) ?? 0);

  function capacityFor(assignment: AssignmentRow, monthKey: string): number {
    return overrideMap.get(`${assignment.employeeId}|${monthKey}`) ?? assignment.employee.monthlyCapacityHours;
  }

  function fmt(hours: number, capacity: number): string {
    return inputMode === 'percent' ? `${Math.round(hoursToPercent(hours, capacity) * 10) / 10}%` : `${hours}h`;
  }

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
              const capacity = capacityFor(a, m);
              return (
                <td key={m} className="px-3 py-2 text-center tabular-nums">
                  <div>{fmt(planned(a.employeeId, m), capacity)}</div>
                  <div className="text-xs text-muted">{fmt(actual(a.employeeId, m), capacity)}</div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-charcoal/20 font-semibold">
          <td className="px-5 py-3">{t('planning.total')}</td>
          {months.map((m) => {
            const plan = roundHours(assignments.reduce((s, a) => s + planned(a.employeeId, m), 0));
            const act = roundHours(assignments.reduce((s, a) => s + actual(a.employeeId, m), 0));
            return (
              <td key={m} className="px-3 py-3 text-center tabular-nums">
                <div>{plan}h</div>
                <div className="text-xs font-normal text-muted">{act}h</div>
              </td>
            );
          })}
        </tr>
      </tfoot>
    </table>
  );
}
