import { useMemo } from 'react';
import type { AssignmentRow } from '../../api/assignments';
import type { MonthlyAllocation } from '../../api/allocations';
import { cellKey } from './gridUtils';
import { monthShortLabel } from '../../lib/months';

export function ProjectPivot({
  projectId,
  assignments,
  months,
  allocations,
  edited,
  onChange,
  language,
  canEdit,
}: {
  projectId: string;
  assignments: AssignmentRow[];
  months: string[];
  allocations: MonthlyAllocation[];
  edited: Map<string, number>;
  onChange: (employeeId: string, projectId: string, monthKey: string, value: number) => void;
  language: 'he' | 'en';
  canEdit: boolean;
}) {
  const allocationMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of allocations) {
      map.set(cellKey(a.employeeId, a.projectId, a.month.slice(0, 7)), Number(a.plannedHours));
    }
    return map;
  }, [allocations]);

  function getValue(employeeId: string, monthKey: string): number {
    const key = cellKey(employeeId, projectId, monthKey);
    return edited.get(key) ?? allocationMap.get(key) ?? 0;
  }

  const totalsByMonth = months.map((m) => assignments.reduce((sum, a) => sum + getValue(a.employeeId, m), 0));

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
        {assignments.length === 0 && (
          <tr>
            <td colSpan={months.length + 1} className="px-5 py-6 text-center text-muted">
              No team members on this project yet.
            </td>
          </tr>
        )}
        {assignments.map((a) => (
          <tr key={a.id} className="border-b border-border last:border-0">
            <td className="px-5 py-2.5 font-medium">
              {a.employee.firstName} {a.employee.lastName}
              {a.roleOnProject && <span className="ms-1.5 text-xs text-muted">({a.roleOnProject})</span>}
            </td>
            {months.map((m) => (
              <td key={m} className="px-1 py-1 text-center">
                {canEdit ? (
                  <input
                    type="number"
                    min={0}
                    className="w-16 rounded-md border border-transparent bg-transparent px-1 py-1 text-center tabular-nums outline-none hover:border-border focus:border-charcoal focus:bg-surface"
                    value={getValue(a.employeeId, m)}
                    onChange={(e) => onChange(a.employeeId, projectId, m, Number(e.target.value))}
                  />
                ) : (
                  <span className="tabular-nums">{getValue(a.employeeId, m)}</span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-charcoal/20 font-semibold">
          <td className="px-5 py-3">Total</td>
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
