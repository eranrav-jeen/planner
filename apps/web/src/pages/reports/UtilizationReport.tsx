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
import { TableStatusRow } from '../../components/ui/table-status-row';
import type { UtilizationRow } from '../../api/reports';

export function UtilizationReport() {
  const { language, t } = useLanguage();
  const [windowStart, setWindowStart] = useState(currentMonthKey());
  const [windowSize, setWindowSize] = useState(6);
  const [employeeId, setEmployeeId] = useState('');

  const to = addMonthsToKey(windowStart, windowSize - 1);
  const { data: employeesData } = useEmployees({ isActive: 'true' });
  const { data, isLoading, isError, refetch } = useUtilizationReport(windowStart, to, { employeeId: employeeId || undefined });
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
            <option value="">{t('reports.allEmployees')}</option>
            {employeesData?.items.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName}
              </option>
            ))}
          </Select>
        </div>
        <ExportButton report="utilization" params={{ from: windowStart, to, employeeId: employeeId || undefined }} />
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <SortHeader label={t('reports.utilization.colEmployee')} sortKey="employeeName" activeKey={sortKey} dir={sortDir} onClick={toggle} />
              <SortHeader label={t('reports.utilization.colMonth')} sortKey="month" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label={t('reports.utilization.colPlanned')} sortKey="plannedHours" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label={t('reports.utilization.colCapacity')} sortKey="capacityHours" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label={t('reports.utilization.colUtilization')} sortKey="utilization" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
            </tr>
          </thead>
          <tbody>
            <TableStatusRow
              colSpan={5}
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && (data?.rows.length ?? 0) === 0}
              emptyMessage={t('reports.utilization.noData')}
              onRetry={refetch}
            />
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
              {data.totalsByMonth.map((row) => (
                <tr key={row.month} className="border-t border-charcoal/20 font-semibold">
                  <td className="px-5 py-2.5">{t('reports.utilization.teamTotal')}</td>
                  <td className="px-3 py-2.5 text-center text-muted">{row.month}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{formatHours(row.plannedHours)}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{formatHours(row.capacityHours)}</td>
                  <td className={cn('px-3 py-2.5 text-center tabular-nums', utilizationClass(row.utilization))}>
                    {formatPercent(row.utilization)}
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
