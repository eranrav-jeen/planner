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

interface ProjectForecastRow {
  projectId: string;
  projectName: string;
  projectCode: string;
  billingType: string;
  method: string;
  total: number;
}

const METHOD_LABELS: Record<string, string> = {
  time_and_materials: 'T&M (blended rate)',
  fixed_price_weighted: 'Fixed price (hours-weighted)',
  fixed_price_even: 'Fixed price (even spread)',
  none: 'No data',
};

export function ForecastReport() {
  const { language } = useLanguage();
  const [windowStart, setWindowStart] = useState(currentMonthKey());
  const [windowSize, setWindowSize] = useState(6);
  const to = addMonthsToKey(windowStart, windowSize - 1);

  const { data, isLoading } = useForecastReport(windowStart, to);
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
          <CardTitle>Forecasted revenue by month</CardTitle>
        </CardHeader>
        <CardContent>
          {!isLoading && data && <RevenueChart data={data.totalsByMonth} language={language} />}
        </CardContent>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <SortHeader label="Project" sortKey="projectName" activeKey={sortKey} dir={sortDir} onClick={toggle} />
              <SortHeader label="Billing type" sortKey="billingType" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Method" sortKey="method" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Forecasted revenue" sortKey="total" activeKey={sortKey} dir={sortDir} onClick={toggle} align="end" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-muted">
                  Loading...
                </td>
              </tr>
            )}
            {sorted.map((row) => (
              <tr key={row.projectId} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5 font-medium">
                  {row.projectName} <span className="text-muted">({row.projectCode})</span>
                </td>
                <td className="px-3 py-2.5 text-center text-muted">{row.billingType.replace(/_/g, ' ')}</td>
                <td className="px-3 py-2.5 text-center text-xs text-muted">{METHOD_LABELS[row.method] ?? row.method}</td>
                <td className="px-3 py-2.5 text-end tabular-nums">{formatCurrency(row.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-charcoal/20 font-semibold">
              <td className="px-5 py-3" colSpan={3}>
                Total
              </td>
              <td className="px-3 py-3 text-end tabular-nums">{formatCurrency(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}
