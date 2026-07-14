import { useState } from 'react';
import { useUtilizationReport } from '../../api/reports';
import { useEmployees } from '../../api/employees';
import { Card } from '../../components/ui/card';
import { Select } from '../../components/ui/input';
import { SortHeader } from '../../components/ui/sortHeader';
import { useSort } from '../../lib/useSort';
import { useLanguage } from '../../lib/i18n';
import { addMonthsToKey, currentMonthKey } from '../../lib/months';
import { formatHours, formatPercent } from '../../lib/format';
import { utilizationClass } from '../planning/gridUtils';
import { cn } from '../../lib/utils';
import { ExportButton } from './ExportButton';
import { MonthRangeControl } from './MonthRangeControl';
import type { UtilizationRow } from '../../api/reports';

export function UtilizationReport() {
  const { language } = useLanguage();
  const [windowStart, setWindowStart] = useState(currentMonthKey());
  const [windowSize, setWindowSize] = useState(6);
  const [employeeId, setEmployeeId] = useState('');

  const to = addMonthsToKey(windowStart, windowSize - 1);
  const { data: employeesData } = useEmployees({ isActive: 'true' });
  const { data, isLoading } = useUtilizationReport(windowStart, to, { employeeId: employeeId || undefined });
  const { sorted, sortKey, sortDir, toggle } = useSort<UtilizationRow>(data?.rows ?? [], 'employeeName', 'asc');

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <MonthRangeControl
            windowStart={windowStart}
            windowSize={windowSize}
            onChangeStart={setWindowStart}
            onChangeSize={setWindowSize}
            language={language}
          />
          <Select className="w-48" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">All employees</option>
            {employeesData?.items.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName}
              </option>
            ))}
          </Select>
        </div>
        <ExportButton />
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <SortHeader label="Employee" sortKey="employeeName" activeKey={sortKey} dir={sortDir} onClick={toggle} />
              <SortHeader label="Month" sortKey="month" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Planned" sortKey="plannedHours" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Capacity" sortKey="capacityHours" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Utilization" sortKey="utilization" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-muted">
                  Loading...
                </td>
              </tr>
            )}
            {sorted.map((row) => (
              <tr key={`${row.employeeId}-${row.month}`} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5 font-medium">{row.employeeName}</td>
                <td className="px-3 py-2.5 text-center text-muted">{row.month}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{formatHours(row.plannedHours)}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{formatHours(row.capacityHours)}</td>
                <td className={cn('px-3 py-2.5 text-center tabular-nums font-medium', utilizationClass(row.utilization))}>
                  {formatPercent(row.utilization)}
                </td>
              </tr>
            ))}
          </tbody>
          {data && data.totalsByMonth.length > 0 && (
            <tfoot>
              {data.totalsByMonth.map((t) => (
                <tr key={t.month} className="border-t border-charcoal/20 font-semibold">
                  <td className="px-5 py-2.5">Team total</td>
                  <td className="px-3 py-2.5 text-center text-muted">{t.month}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{formatHours(t.plannedHours)}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{formatHours(t.capacityHours)}</td>
                  <td className={cn('px-3 py-2.5 text-center tabular-nums', utilizationClass(t.utilization))}>
                    {formatPercent(t.utilization)}
                  </td>
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}
