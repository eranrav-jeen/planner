import { usePortfolioReport } from '../../api/reports';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { SortHeader } from '../../components/ui/sortHeader';
import { useSort } from '../../lib/useSort';
import { formatCurrency, formatHours } from '../../lib/format';
import { ExportButton } from './ExportButton';
import type { PortfolioRow } from '../../api/reports';

export function PortfolioReport() {
  const { data, isLoading } = usePortfolioReport();
  const { sorted, sortKey, sortDir, toggle } = useSort<PortfolioRow>(data?.rows ?? [], 'totalIncome', 'desc');

  const totals = (data?.rows ?? []).reduce(
    (acc, r) => ({
      projectCount: acc.projectCount + r.projectCount,
      activeProjectCount: acc.activeProjectCount + r.activeProjectCount,
      totalIncome: acc.totalIncome + r.totalIncome,
      totalHoursPaid: acc.totalHoursPaid + r.totalHoursPaid,
    }),
    { projectCount: 0, activeProjectCount: 0, totalIncome: 0, totalHoursPaid: 0 },
  );

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <ExportButton />
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <SortHeader label="Customer" sortKey="customerName" activeKey={sortKey} dir={sortDir} onClick={toggle} />
              <SortHeader label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Projects" sortKey="projectCount" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Active" sortKey="activeProjectCount" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Total income" sortKey="totalIncome" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Hours paid" sortKey="totalHoursPaid" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-muted">
                  Loading...
                </td>
              </tr>
            )}
            {sorted.map((row) => (
              <tr key={row.customerId} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5 font-medium">{row.customerName}</td>
                <td className="px-3 py-2.5 text-center">
                  <Badge status={row.status}>{row.status}</Badge>
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums">{row.projectCount}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{row.activeProjectCount}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{formatCurrency(row.totalIncome)}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{formatHours(row.totalHoursPaid)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-charcoal/20 font-semibold">
              <td className="px-5 py-3">Total</td>
              <td />
              <td className="px-3 py-3 text-center tabular-nums">{totals.projectCount}</td>
              <td className="px-3 py-3 text-center tabular-nums">{totals.activeProjectCount}</td>
              <td className="px-3 py-3 text-center tabular-nums">{formatCurrency(totals.totalIncome)}</td>
              <td className="px-3 py-3 text-center tabular-nums">{formatHours(totals.totalHoursPaid)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}
