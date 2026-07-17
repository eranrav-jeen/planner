import { AlertTriangle, BadgeAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../lib/i18n';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { RevenueChart } from '../components/charts/RevenueChart';
import { useDashboardSummary, useForecastReport, useUtilizationReport } from '../api/reports';
import { addMonthsToKey, currentMonthKey, monthShortLabel } from '../lib/months';
import { formatCurrency, formatHours, formatPercent } from '../lib/format';
import { utilizationClass } from './planning/gridUtils';
import { ErrorState } from '../components/ui/error-state';
import { cn } from '../lib/utils';

const HEATMAP_MONTHS = 6;

export function Dashboard() {
  const { t, language } = useLanguage();
  const from = currentMonthKey();
  const to = addMonthsToKey(from, HEATMAP_MONTHS - 1);

  const { data: summary, isError: summaryError, refetch: refetchSummary } = useDashboardSummary();
  const { data: forecast } = useForecastReport(from, to);
  const { data: utilization } = useUtilizationReport(from, to);

  const employeeNames = Array.from(new Map((utilization?.rows ?? []).map((r) => [r.employeeId, r.employeeName])));
  const months = Array.from({ length: HEATMAP_MONTHS }, (_, i) => addMonthsToKey(from, i));

  if (summaryError) {
    return (
      <div>
        <PageHeader title={t('nav.dashboard')} showBack={false} />
        <Card>
          <ErrorState message="Couldn't load dashboard data." onRetry={refetchSummary} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t('nav.dashboard')} showBack={false} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle>Active projects</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {summary?.activeProjectCount ?? '—'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contracted income</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {summary ? formatCurrency(summary.totalContractedIncome) : '—'}
            {summary && summary.activeLicenseRevenue > 0 && (
              <p className="text-xs font-normal text-muted">
                {formatCurrency(summary.totalIncome)} projects + {formatCurrency(summary.activeLicenseRevenue)} active licenses
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Paid hours vs consumed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {summary ? (
              <>
                {formatHours(summary.totalHoursConsumed)}{' '}
                <span className="text-base font-normal text-muted">/ {formatHours(summary.totalHoursPaid)}</span>
              </>
            ) : (
              '—'
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Projects at risk</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {summary?.atRiskProjects.length ?? '—'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Licensed customers</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {summary ? (
              <>
                {summary.licensedCustomerCount}{' '}
                <span className="text-base font-normal text-muted">
                  / {formatCurrency(summary.totalLicenseRevenue)}/yr
                </span>
              </>
            ) : (
              '—'
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue forecast (next {HEATMAP_MONTHS} months)</CardTitle>
          </CardHeader>
          <CardContent>
            {forecast && <RevenueChart data={forecast.totalsByMonth} language={language} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects at risk</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!summary || summary.atRiskProjects.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted">No projects at risk.</p>
            ) : (
              <ul className="divide-y divide-border">
                {summary.atRiskProjects.map((p) => (
                  <li key={p.projectId} className="flex items-start gap-3 px-5 py-3 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
                    <div>
                      <div className="font-medium">
                        {p.projectName} <span className="text-muted">({p.projectCode})</span>
                      </div>
                      <div className="text-muted">{p.reason}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Licenses needing attention</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!summary || summary.licenseAttention.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted">No license issues.</p>
          ) : (
            <ul className="divide-y divide-border">
              {summary.licenseAttention.map((l) => (
                <li key={l.customerId} className="flex items-start gap-3 px-5 py-3 text-sm">
                  <BadgeAlert className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
                  <div>
                    <Link to={`/customers/${l.customerId}`} className="font-medium hover:underline">
                      {l.customerName}
                    </Link>
                    <div className="text-muted">{l.reason}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Team utilization heatmap</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
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
              {employeeNames.length === 0 && (
                <tr>
                  <td colSpan={months.length + 1} className="px-5 py-6 text-center text-muted">
                    No data yet.
                  </td>
                </tr>
              )}
              {employeeNames.map(([employeeId, name]) => (
                <tr key={employeeId} className="border-b border-border last:border-0">
                  <td className="px-5 py-2 font-medium">{name}</td>
                  {months.map((m) => {
                    const row = utilization?.rows.find((r) => r.employeeId === employeeId && r.month === m);
                    return (
                      <td
                        key={m}
                        className={cn('px-3 py-2 text-center tabular-nums', utilizationClass(row?.utilization ?? 0))}
                      >
                        {row ? formatPercent(row.utilization) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
