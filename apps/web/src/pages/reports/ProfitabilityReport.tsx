import { useState } from 'react';
import { useProfitabilityReport } from '../../api/reports';
import { useCustomers } from '../../api/customers';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select } from '../../components/ui/input';
import { SortHeader } from '../../components/ui/sortHeader';
import { useSort } from '../../lib/useSort';
import { formatCurrency, formatPercent } from '../../lib/format';
import { ExportButton } from './ExportButton';
import type { ProfitabilityRow } from '../../api/reports';

export function ProfitabilityReport() {
  const [customerId, setCustomerId] = useState('');
  const { data: customersData } = useCustomers();
  const { data, isLoading } = useProfitabilityReport({ customerId: customerId || undefined });
  const { sorted, sortKey, sortDir, toggle } = useSort<ProfitabilityRow>(data?.rows ?? [], 'margin', 'desc');

  const totals = (data?.rows ?? []).reduce(
    (acc, r) => ({ income: acc.income + r.income, cost: acc.cost + r.cost, margin: acc.margin + r.margin }),
    { income: 0, cost: 0, margin: 0 },
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select className="w-52" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">All customers</option>
          {customersData?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <ExportButton report="profitability" params={{ customerId: customerId || undefined }} />
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <SortHeader label="Project" sortKey="projectName" activeKey={sortKey} dir={sortDir} onClick={toggle} />
              <SortHeader label="Customer" sortKey="customerName" activeKey={sortKey} dir={sortDir} onClick={toggle} />
              <SortHeader label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Income" sortKey="income" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Cost" sortKey="cost" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Margin" sortKey="margin" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Margin %" sortKey="marginPercent" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-muted">
                  Loading...
                </td>
              </tr>
            )}
            {sorted.map((row) => (
              <tr key={row.projectId} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5 font-medium">
                  {row.projectName} <span className="text-muted">({row.projectCode})</span>
                </td>
                <td className="px-3 py-2.5 text-muted">{row.customerName}</td>
                <td className="px-3 py-2.5 text-center">
                  <Badge status={row.status}>{row.status.replace('_', ' ')}</Badge>
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums">{formatCurrency(row.income)}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{formatCurrency(row.cost)}</td>
                <td className={`px-3 py-2.5 text-center tabular-nums font-medium ${row.margin < 0 ? 'text-coral' : 'text-success'}`}>
                  {formatCurrency(row.margin)}
                </td>
                <td className={`px-3 py-2.5 text-center tabular-nums ${row.marginPercent < 0 ? 'text-coral' : ''}`}>
                  {formatPercent(row.marginPercent)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-charcoal/20 font-semibold">
              <td className="px-5 py-3" colSpan={3}>
                Total
              </td>
              <td className="px-3 py-3 text-center tabular-nums">{formatCurrency(totals.income)}</td>
              <td className="px-3 py-3 text-center tabular-nums">{formatCurrency(totals.cost)}</td>
              <td className="px-3 py-3 text-center tabular-nums">{formatCurrency(totals.margin)}</td>
              <td className="px-3 py-3 text-center tabular-nums">
                {formatPercent(totals.income > 0 ? totals.margin / totals.income : 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}
