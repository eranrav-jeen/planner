import { useState } from 'react';
import { useDemandCapacityReport } from '../../api/reports';
import { Card } from '../../components/ui/card';
import { SortHeader } from '../../components/ui/sortHeader';
import { useSort } from '../../lib/useSort';
import { useLanguage } from '../../lib/i18n';
import { addMonthsToKey, currentMonthKey } from '../../lib/months';
import { formatHours } from '../../lib/format';
import { ExportButton } from './ExportButton';
import { MonthRangeControl } from './MonthRangeControl';

interface Row {
  month: string;
  demand: number;
  capacity: number;
  gap: number;
}

export function DemandCapacityReport() {
  const { language } = useLanguage();
  const [windowStart, setWindowStart] = useState(currentMonthKey());
  const [windowSize, setWindowSize] = useState(6);
  const to = addMonthsToKey(windowStart, windowSize - 1);

  const { data, isLoading } = useDemandCapacityReport(windowStart, to);
  const { sorted, sortKey, sortDir, toggle } = useSort<Row>(data?.rows ?? [], 'month', 'asc');

  const totals = (data?.rows ?? []).reduce(
    (acc, r) => ({ demand: acc.demand + r.demand, capacity: acc.capacity + r.capacity, gap: acc.gap + r.gap }),
    { demand: 0, capacity: 0, gap: 0 },
  );

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
        <ExportButton />
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <SortHeader label="Month" sortKey="month" activeKey={sortKey} dir={sortDir} onClick={toggle} />
              <SortHeader label="Demand" sortKey="demand" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Capacity" sortKey="capacity" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Gap" sortKey="gap" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
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
              <tr key={row.month} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5 font-medium">{row.month}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{formatHours(row.demand)}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{formatHours(row.capacity)}</td>
                <td className={`px-3 py-2.5 text-center tabular-nums font-medium ${row.gap < 0 ? 'text-coral' : 'text-success'}`}>
                  {formatHours(row.gap)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-charcoal/20 font-semibold">
              <td className="px-5 py-3">Total</td>
              <td className="px-3 py-3 text-center tabular-nums">{formatHours(totals.demand)}</td>
              <td className="px-3 py-3 text-center tabular-nums">{formatHours(totals.capacity)}</td>
              <td className="px-3 py-3 text-center tabular-nums">{formatHours(totals.gap)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}
