import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Employee } from '../../api/types';
import type { MonthlyAllocation } from '../../api/allocations';
import type { CapacityOverride } from '../../api/capacityOverrides';
import type { AssignmentRow } from '../../api/assignments';
import { cellKey, hoursToPercent, roundHours, utilizationClass, type InputMode } from './gridUtils';
import { monthShortLabel } from '../../lib/months';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../lib/i18n';

export function EmployeePivot({
  employees,
  months,
  assignments,
  allocations,
  overrides,
  language,
  inputMode,
}: {
  employees: Employee[];
  months: string[];
  assignments: AssignmentRow[];
  allocations: MonthlyAllocation[];
  overrides: CapacityOverride[];
  language: 'he' | 'en';
  inputMode: InputMode;
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  const assignmentsByEmployee = useMemo(() => {
    const map = new Map<string, AssignmentRow[]>();
    for (const a of assignments) {
      const list = map.get(a.employeeId) ?? [];
      list.push(a);
      map.set(a.employeeId, list);
    }
    return map;
  }, [assignments]);

  const overrideMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of overrides) map.set(`${o.employeeId}|${o.month.slice(0, 7)}`, Number(o.capacityHours));
    return map;
  }, [overrides]);

  const planned = (employeeId: string, projectId: string, monthKey: string) =>
    roundHours(plannedMap.get(cellKey(employeeId, projectId, monthKey)) ?? 0);
  const actual = (employeeId: string, projectId: string, monthKey: string) =>
    roundHours(actualMap.get(cellKey(employeeId, projectId, monthKey)) ?? 0);

  function capacityFor(employee: Employee, monthKey: string): number {
    return overrideMap.get(`${employee.id}|${monthKey}`) ?? employee.monthlyCapacityHours;
  }

  function fmt(hours: number, capacity: number): string {
    return inputMode === 'percent' ? `${Math.round(hoursToPercent(hours, capacity) * 10) / 10}%` : `${hours}h`;
  }

  function toggle(employeeId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
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
        {employees.map((employee) => {
          const projects = assignmentsByEmployee.get(employee.id) ?? [];
          const isExpanded = expanded.has(employee.id);
          return (
            <>
              <tr
                key={employee.id}
                onClick={() => toggle(employee.id)}
                className="cursor-pointer border-b border-border hover:bg-bg"
              >
                <td className="px-5 py-2.5 font-medium">
                  <span className="flex items-center gap-1.5">
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted" /> : <ChevronRight className="h-3.5 w-3.5 text-muted" />}
                    {employee.firstName} {employee.lastName}
                  </span>
                </td>
                {months.map((m) => {
                  const plan = roundHours(projects.reduce((s, p) => s + planned(employee.id, p.projectId, m), 0));
                  const act = roundHours(projects.reduce((s, p) => s + actual(employee.id, p.projectId, m), 0));
                  const capacity = capacityFor(employee, m);
                  const ratio = capacity > 0 ? plan / capacity : plan > 0 ? 2 : 0;
                  return (
                    <td key={m} className={cn('px-3 py-2 text-center tabular-nums', utilizationClass(ratio))}>
                      <div>
                        {fmt(plan, capacity)}
                        {inputMode === 'hours' && <span className="text-xs opacity-70"> ({Math.round(hoursToPercent(plan, capacity))}%)</span>}
                      </div>
                      <div className="text-xs text-muted">{fmt(act, capacity)}</div>
                    </td>
                  );
                })}
              </tr>
              {isExpanded &&
                (projects.length === 0 ? (
                  <tr key={`${employee.id}-empty`} className="border-b border-border bg-bg/60">
                    <td colSpan={months.length + 1} className="px-5 py-2 ps-10 text-xs text-muted">
                      {t('planning.noProjectAssignments')}
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => (
                    <tr key={p.id} className="border-b border-border bg-bg/60">
                      <td className="px-5 py-2 ps-10 text-xs text-muted">
                        {p.project.name} <span className="text-muted/70">({p.project.code})</span>
                      </td>
                      {months.map((m) => {
                        const capacity = capacityFor(employee, m);
                        return (
                          <td key={m} className="px-3 py-2 text-center tabular-nums">
                            <div>{fmt(planned(employee.id, p.projectId, m), capacity)}</div>
                            <div className="text-xs text-muted">{fmt(actual(employee.id, p.projectId, m), capacity)}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ))}
            </>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-charcoal/20 font-semibold">
          <td className="px-5 py-3">{t('planning.teamTotal')}</td>
          {months.map((m) => {
            const capacity = roundHours(employees.reduce((s, e) => s + capacityFor(e, m), 0));
            const plan = roundHours(
              employees.reduce(
                (sum, e) => sum + (assignmentsByEmployee.get(e.id) ?? []).reduce((s, p) => s + planned(e.id, p.projectId, m), 0),
                0,
              ),
            );
            const act = roundHours(
              employees.reduce(
                (sum, e) => sum + (assignmentsByEmployee.get(e.id) ?? []).reduce((s, p) => s + actual(e.id, p.projectId, m), 0),
                0,
              ),
            );
            return (
              <td key={m} className="px-3 py-3 text-center tabular-nums">
                <div>
                  {plan}h <span className="font-normal text-muted">/ {capacity}h</span>
                </div>
                <div className="text-xs font-normal text-muted">{act}h</div>
              </td>
            );
          })}
        </tr>
      </tfoot>
    </table>
  );
}
