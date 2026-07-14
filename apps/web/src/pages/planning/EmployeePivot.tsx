import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Employee } from '../../api/types';
import type { MonthlyAllocation } from '../../api/allocations';
import type { CapacityOverride } from '../../api/capacityOverrides';
import type { AssignmentRow } from '../../api/assignments';
import { cellKey, utilizationClass } from './gridUtils';
import { monthShortLabel } from '../../lib/months';
import { cn } from '../../lib/utils';

export function EmployeePivot({
  employees,
  months,
  assignments,
  allocations,
  overrides,
  edited,
  onChange,
  language,
  canEdit,
}: {
  employees: Employee[];
  months: string[];
  assignments: AssignmentRow[];
  allocations: MonthlyAllocation[];
  overrides: CapacityOverride[];
  edited: Map<string, number>;
  onChange: (employeeId: string, projectId: string, monthKey: string, value: number) => void;
  language: 'he' | 'en';
  canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const allocationMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of allocations) {
      map.set(cellKey(a.employeeId, a.projectId, a.month.slice(0, 7)), Number(a.plannedHours));
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
    for (const o of overrides) {
      map.set(`${o.employeeId}|${o.month.slice(0, 7)}`, Number(o.capacityHours));
    }
    return map;
  }, [overrides]);

  function getValue(employeeId: string, projectId: string, monthKey: string): number {
    const key = cellKey(employeeId, projectId, monthKey);
    return edited.get(key) ?? allocationMap.get(key) ?? 0;
  }

  function capacityFor(employee: Employee, monthKey: string): number {
    return overrideMap.get(`${employee.id}|${monthKey}`) ?? employee.monthlyCapacityHours;
  }

  function toggle(employeeId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  }

  const teamCapacityByMonth = months.map((m) =>
    employees.reduce((sum, e) => sum + capacityFor(e, m), 0),
  );
  const teamPlannedByMonth = months.map((m) =>
    employees.reduce((sum, e) => {
      const projects = assignmentsByEmployee.get(e.id) ?? [];
      return sum + projects.reduce((s, p) => s + getValue(e.id, p.projectId, m), 0);
    }, 0),
  );

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-xs uppercase text-muted">
          <th className="px-5 py-3 text-start font-medium">Employee</th>
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
                  const total = projects.reduce((sum, p) => sum + getValue(employee.id, p.projectId, m), 0);
                  const capacity = capacityFor(employee, m);
                  const ratio = capacity > 0 ? total / capacity : total > 0 ? 2 : 0;
                  return (
                    <td key={m} className={cn('px-3 py-2.5 text-center tabular-nums', utilizationClass(ratio))}>
                      {total}h
                    </td>
                  );
                })}
              </tr>
              {isExpanded &&
                (projects.length === 0 ? (
                  <tr key={`${employee.id}-empty`} className="border-b border-border bg-bg/60">
                    <td colSpan={months.length + 1} className="px-5 py-2 ps-10 text-xs text-muted">
                      No project assignments.
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => (
                    <tr key={p.id} className="border-b border-border bg-bg/60">
                      <td className="px-5 py-2 ps-10 text-xs text-muted">
                        {p.project.name} <span className="text-muted/70">({p.project.code})</span>
                      </td>
                      {months.map((m) => (
                        <td key={m} className="px-1 py-1 text-center">
                          {canEdit ? (
                            <input
                              type="number"
                              min={0}
                              className="w-16 rounded-md border border-transparent bg-transparent px-1 py-1 text-center tabular-nums outline-none hover:border-border focus:border-charcoal focus:bg-surface"
                              value={getValue(employee.id, p.projectId, m)}
                              onChange={(e) => onChange(employee.id, p.projectId, m, Number(e.target.value))}
                            />
                          ) : (
                            <span className="tabular-nums">{getValue(employee.id, p.projectId, m)}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                ))}
            </>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-charcoal/20 font-semibold">
          <td className="px-5 py-3">Team total</td>
          {months.map((m, i) => (
            <td key={m} className="px-3 py-3 text-center tabular-nums">
              {teamPlannedByMonth[i]}h <span className="font-normal text-muted">/ {teamCapacityByMonth[i]}h</span>
            </td>
          ))}
        </tr>
      </tfoot>
    </table>
  );
}
