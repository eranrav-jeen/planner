import { useState } from 'react';
import { useForecastReport } from '../../api/reports';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { SortHeader } from '../../components/ui/sortHeader';
import { RevenueChart } from '../../components/charts/RevenueChart';
import { useSort } from '../../lib/useSort';
import { useLanguage } from '../../lib/i18n';
import { addMonthsToKey, currentMonthKey } from '../../lib/months';
import { formatCurrency } from '../../lib/format';
import { ExportButton } from './ExportButton';
import { MonthRangeControl } from './MonthRangeControl';
import { TableStatusRow } from '../../components/ui/table-status-row';

interface ProjectForecastRow {
  projectId: string;
  projectName: string;
  projectCode: string;
  billingType: string;
  method: string;
  total: number;
}

const METHOD_KEYS: Record<string, string> = {
  time_and_materials: 'reports.forecast.method.tm',
  fixed_price_weighted: 'reports.forecast.method.fixedWeighted',
  fixed_price_even: 'reports.forecast.method.fixedEven',
  none: 'reports.forecast.method.none',
};

export function ForecastReport() {
  const { language, t } = useLanguage();
  const [windowStart, setWindowStart] = useState(currentMonthKey());
  const [windowSize, setWindowSize] = useState(6);
  const to = addMonthsToKey(windowStart, windowSize - 1);

  const { data, isLoading, isError, refetch } = useForecastReport(windowStart, to);
  const rows: ProjectForecastRow[] = (data?.byProject ?? []).map((p) => ({
    projectId: p.projectId,
    projectName: p.projectName,
    projectCode: p.projectCode,
    billingType: p.billingType,
    method: p.method,
    total: p.total,
  }));
  const { sorted, sortKey, sortDir, toggle } = useSort<ProjectForecastRow>(rows, 'total', 'desc');
  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <MonthRangeControl
          windowStart={windowStart}
          windowSize={windowSize}
          onChangeStart={setWindowStart}
          onChangeSize={setWindowSize}
          language={language}
        />
        <ExportButton report="forecast" params={{ from: windowStart, to }} />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('reports.forecast.byMonth')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!isLoading && data && <RevenueChart data={data.totalsByMonth} language={language} />}
        </CardContent>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <SortHeader label={t('reports.forecast.colProject')} sortKey="projectName" activeKey={sortKey} dir={sortDir} onClick={toggle} />
              <SortHeader label={t('reports.forecast.colBillingType')} sortKey="billingType" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label={t('reports.forecast.colMethod')} sortKey="method" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label={t('reports.forecast.colForecastedRevenue')} sortKey="total" activeKey={sortKey} dir={sortDir} onClick={toggle} align="end" />
            </tr>
          </thead>
          <tbody>
            <TableStatusRow colSpan={4} isLoading={isLoading} isError={isError} onRetry={refetch} />
            {sorted.map((row) => (
              <tr key={row.projectId} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5 font-medium">
                  {row.projectName} <span className="text-muted">({row.projectCode})</span>
                </td>
                <td className="px-3 py-2.5 text-center text-muted">{t(`billing.${row.billingType}`)}</td>
                <td className="px-3 py-2.5 text-center text-xs text-muted">
                  {t(METHOD_KEYS[row.method] ?? row.method)}
                </td>
                <td className="px-3 py-2.5 text-end tabular-nums">{formatCurrency(row.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-charcoal/20 font-semibold">
              <td className="px-5 py-3" colSpan={3}>
                {t('reports.forecast.total')}
              </td>
              <td className="px-3 py-3 text-end tabular-nums">{formatCurrency(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}
