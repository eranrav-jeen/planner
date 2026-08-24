import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePacingReport, type PacingDimension, type PacingPeriod, type PacingRow } from '../../api/reports';
import { Card } from '../../components/ui/card';
import { TableStatusRow } from '../../components/ui/table-status-row';
import { useLanguage } from '../../lib/i18n';
import { addMonthsToKey, currentMonthKey, monthShortLabel } from '../../lib/months';
import { formatHours, formatPercent } from '../../lib/format';
import { cn } from '../../lib/utils';

const toggleBtn = (active: boolean) =>
  cn('rounded-md px-3 py-1.5 text-sm font-medium', active ? 'bg-charcoal text-white' : 'text-charcoal/70 hover:bg-bg');

function statusClass(status: PacingRow['status']): string {
  switch (status) {
    case 'over':
    case 'ahead':
    case 'met':
    case 'on_track':
      return 'bg-success/10 text-success';
    case 'under':
    case 'behind':
      return 'bg-coral/15 text-coral';
    default:
      return 'bg-border text-muted';
  }
}

export function PacingReport() {
  const { language, t } = useLanguage();
  const [dimension, setDimension] = useState<PacingDimension>('project');
  const [period, setPeriod] = useState<PacingPeriod>('month');
  const [anchor, setAnchor] = useState(currentMonthKey());

  const { data, isLoading, isError, refetch } = usePacingReport(dimension, period, anchor);

  const step = period === 'quarter' ? 3 : 1;
  const [yStr, mStr] = anchor.split('-');
  const quarterLabel = `Q${Math.floor((Number(mStr) - 1) / 3) + 1} ${yStr}`;
  const periodLabel = period === 'quarter' ? quarterLabel : monthShortLabel(anchor, language);

  function suggestion(row: PacingRow): string {
    const pctP = row.pctProjected != null ? formatPercent(row.pctProjected) : '';
    switch (row.status) {
      case 'not_started':
        return t('reports.pacing.sugg.not_started');
      case 'no_plan':
        return t('reports.pacing.sugg.no_plan', { actual: formatHours(row.actual) });
      case 'met':
        return t('reports.pacing.sugg.met', { pct: formatPercent(row.pctActual ?? 0) });
      case 'over':
        return t('reports.pacing.sugg.over', { delta: formatHours(-row.remainingPlanned) });
      case 'under':
        return t('reports.pacing.sugg.under', {
          delta: formatHours(row.remainingPlanned),
          pct: formatPercent(row.pctActual ?? 0),
        });
      case 'on_track':
        return t('reports.pacing.sugg.on_track', { pct: pctP });
      case 'ahead':
        return t('reports.pacing.sugg.ahead', { pct: pctP });
      case 'behind':
        return row.requiredPerWeek != null
          ? t('reports.pacing.sugg.behind', {
              pct: pctP,
              perWeek: row.requiredPerWeek,
              current: row.currentPerWeek ?? 0,
            })
          : t('reports.pacing.sugg.behindNoTime', { pct: pctP, delta: formatHours(row.remainingPlanned) });
      default:
        return '';
    }
  }

  const totals = (data?.rows ?? []).reduce(
    (acc, r) => ({
      planned: acc.planned + r.planned,
      actual: acc.actual + r.actual,
      projected: acc.projected + (r.projected ?? r.actual),
    }),
    { planned: 0, actual: 0, projected: 0 },
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          <button type="button" className={toggleBtn(dimension === 'customer')} onClick={() => setDimension('customer')}>
            {t('reports.pacing.byCustomer')}
          </button>
          <button type="button" className={toggleBtn(dimension === 'project')} onClick={() => setDimension('project')}>
            {t('reports.pacing.byProject')}
          </button>
          <button type="button" className={toggleBtn(dimension === 'employee')} onClick={() => setDimension('employee')}>
            {t('reports.pacing.byEmployee')}
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          <button type="button" className={toggleBtn(period === 'month')} onClick={() => setPeriod('month')}>
            {t('reports.pacing.month')}
          </button>
          <button type="button" className={toggleBtn(period === 'quarter')} onClick={() => setPeriod('quarter')}>
            {t('reports.pacing.quarter')}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAnchor((a) => addMonthsToKey(a, -step))}
            className="rounded-md border border-border p-1.5 hover:bg-bg"
          >
            <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
          </button>
          <span className="min-w-24 text-center text-sm font-medium tabular-nums">{periodLabel}</span>
          <button
            type="button"
            onClick={() => setAnchor((a) => addMonthsToKey(a, step))}
            className="rounded-md border border-border p-1.5 hover:bg-bg"
          >
            <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </button>
        </div>
      </div>

      {data && (
        <p className="mb-2 text-xs text-muted">
          {t('reports.pacing.elapsed', {
            elapsed: data.elapsedBusinessDays,
            total: data.totalBusinessDays,
            remaining: data.remainingBusinessDays,
          })}
          {' · '}
          {t('reports.pacing.note')}
        </p>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="px-5 py-3 text-start font-medium">{t('reports.pacing.colName')}</th>
              <th className="px-3 py-3 text-center font-medium">{t('reports.pacing.colPlanned')}</th>
              <th className="px-3 py-3 text-center font-medium">{t('reports.pacing.colActual')}</th>
              <th className="px-3 py-3 text-center font-medium">{t('reports.pacing.colPctActual')}</th>
              <th className="px-3 py-3 text-center font-medium">{t('reports.pacing.colProjected')}</th>
              <th className="px-3 py-3 text-center font-medium">{t('reports.pacing.colPctProjected')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('reports.pacing.colSuggestion')}</th>
            </tr>
          </thead>
          <tbody>
            <TableStatusRow
              colSpan={7}
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && (data?.rows.length ?? 0) === 0}
              emptyMessage={t('reports.pacing.none')}
              onRetry={refetch}
            />
            {data?.rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0 align-top">
                <td className="px-5 py-2.5">
                  <div className="font-medium">{row.name}</div>
                  {row.sublabel && <div className="text-xs text-muted">{row.sublabel}</div>}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums">{formatHours(row.planned)}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{formatHours(row.actual)}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">
                  {row.pctActual != null ? formatPercent(row.pctActual) : '—'}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums">
                  {row.projected != null ? formatHours(row.projected) : '—'}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums">
                  {row.pctProjected != null ? formatPercent(row.pctProjected) : '—'}
                </td>
                <td className="px-5 py-2.5">
                  <span className={cn('me-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium', statusClass(row.status))}>
                    {t(`reports.pacing.status.${row.status}`)}
                  </span>
                  <span className="text-muted">{suggestion(row)}</span>
                </td>
              </tr>
            ))}
          </tbody>
          {data && data.rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-charcoal/20 font-semibold">
                <td className="px-5 py-3">{t('reports.pacing.total')}</td>
                <td className="px-3 py-3 text-center tabular-nums">{formatHours(totals.planned)}</td>
                <td className="px-3 py-3 text-center tabular-nums">{formatHours(totals.actual)}</td>
                <td className="px-3 py-3 text-center tabular-nums">
                  {totals.planned > 0 ? formatPercent(totals.actual / totals.planned) : '—'}
                </td>
                <td className="px-3 py-3 text-center tabular-nums">{formatHours(totals.projected)}</td>
                <td className="px-3 py-3 text-center tabular-nums">
                  {totals.planned > 0 ? formatPercent(totals.projected / totals.planned) : '—'}
                </td>
                <td className="px-5 py-3" />
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}
