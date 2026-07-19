import { useState } from 'react';
import { usePlanVsActualReport } from '../../api/reports';
import { useCustomers } from '../../api/customers';
import { Card } from '../../components/ui/card';
import { Select } from '../../components/ui/input';
import { SortHeader } from '../../components/ui/sortHeader';
import { useSort } from '../../lib/useSort';
import { useLanguage } from '../../lib/i18n';
import { addMonthsToKey, currentMonthKey } from '../../lib/months';
import { formatHours, formatPercent } from '../../lib/format';
import { ExportButton } from './ExportButton';
import { MonthRangeControl } from './MonthRangeControl';
import { TableStatusRow } from '../../components/ui/table-status-row';
import type { PlanVsActualRow } from '../../api/reports';

export function PlanVsActualReport() {
  const { language, t } = useLanguage();
  const [windowStart, setWindowStart] = useState(currentMonthKey());
  const [windowSize, setWindowSize] = useState(6);
  const [customerId, setCustomerId] = useState('');
  const to = addMonthsToKey(windowStart, windowSize - 1);

  const { data: customersData } = useCustomers();
  const { data, isLoading, isError, refetch } = usePlanVsActualReport(windowStart, to, {
    customerId: customerId || undefined,
  });
  const { sorted, sortKey, sortDir, toggle } = useSort<PlanVsActualRow>(data?.rows ?? [], 'planned', 'desc');

  const totals = (data?.rows ?? []).reduce(
    (acc, r) => ({ planned: acc.planned + r.planned, actual: acc.actual + r.actual }),
    { planned: 0, actual: 0 },
  );
  const totalVariance = totals.actual - totals.planned;

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
          <Select className="w-52" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">{t('reports.allCustomers')}</option>
            {customersData?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <ExportButton
          report="plan-vs-actual"
          params={{ from: windowStart, to, customerId: customerId || undefined }}
        />
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <SortHeader label={t('reports.planActual.colProject')} sortKey="projectName" activeKey={sortKey} dir={sortDir} onClick={toggle} />
              <SortHeader label={t('reports.planActual.colCustomer')} sortKey="customerName" activeKey={sortKey} dir={sortDir} onClick={toggle} />
              <SortHeader label={t('reports.planActual.colPlanned')} sortKey="planned" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label={t('reports.planActual.colActual')} sortKey="actual" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label={t('reports.planActual.colVariance')} sortKey="variance" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label={t('reports.planActual.colVariancePercent')} sortKey="variancePercent" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
            </tr>
          </thead>
          <tbody>
            <TableStatusRow
              colSpan={6}
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && (data?.rows.length ?? 0) === 0}
              emptyMessage={t('reports.planActual.none')}
              onRetry={refetch}
            />
            {sorted.map((row) => (
              <tr key={row.projectId} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5 font-medium">
                  {row.projectName} <span className="text-muted">({row.projectCode})</span>
                </td>
                <td className="px-3 py-2.5 text-muted">{row.customerName}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{formatHours(row.planned)}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{formatHours(row.actual)}</td>
                <td className={`px-3 py-2.5 text-center tabular-nums font-medium ${row.variance < 0 ? 'text-coral' : 'text-success'}`}>
                  {row.variance > 0 ? '+' : ''}
                  {formatHours(row.variance)}
                </td>
                <td className={`px-3 py-2.5 text-center tabular-nums ${row.variance < 0 ? 'text-coral' : ''}`}>
                  {row.variance > 0 ? '+' : ''}
                  {formatPercent(row.variancePercent)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-charcoal/20 font-semibold">
              <td className="px-5 py-3" colSpan={2}>
                {t('reports.planActual.total')}
              </td>
              <td className="px-3 py-3 text-center tabular-nums">{formatHours(totals.planned)}</td>
              <td className="px-3 py-3 text-center tabular-nums">{formatHours(totals.actual)}</td>
              <td className={`px-3 py-3 text-center tabular-nums ${totalVariance < 0 ? 'text-coral' : 'text-success'}`}>
                {totalVariance > 0 ? '+' : ''}
                {formatHours(totalVariance)}
              </td>
              <td className="px-3 py-3 text-center tabular-nums">
                {totals.planned > 0 ? formatPercent(totalVariance / totals.planned) : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}
