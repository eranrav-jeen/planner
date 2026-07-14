import { useState } from 'react';
import { useProjectBurnReport } from '../../api/reports';
import { useCustomers } from '../../api/customers';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select } from '../../components/ui/input';
import { SortHeader } from '../../components/ui/sortHeader';
import { useSort } from '../../lib/useSort';
import { formatHours, formatPercent } from '../../lib/format';
import { ExportButton } from './ExportButton';
import type { ProjectBurnRow } from '../../api/reports';

export function ProjectBurnReport() {
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('');
  const { data: customersData } = useCustomers();
  const { data, isLoading } = useProjectBurnReport({ customerId: customerId || undefined, status: status || undefined });
  const { sorted, sortKey, sortDir, toggle } = useSort<ProjectBurnRow>(data?.rows ?? [], 'projectName', 'asc');

  const totals = (data?.rows ?? []).reduce(
    (acc, r) => ({ hoursPaid: acc.hoursPaid + r.hoursPaid, consumed: acc.consumed + r.consumed, remaining: acc.remaining + r.remaining }),
    { hoursPaid: 0, consumed: 0, remaining: 0 },
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Select className="w-52" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">All customers</option>
            {customersData?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select className="w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        <ExportButton />
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <SortHeader label="Project" sortKey="projectName" activeKey={sortKey} dir={sortDir} onClick={toggle} />
              <SortHeader label="Customer" sortKey="customerName" activeKey={sortKey} dir={sortDir} onClick={toggle} />
              <SortHeader label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Paid" sortKey="hoursPaid" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Consumed" sortKey="consumed" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="Remaining" sortKey="remaining" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="% used" sortKey="percentConsumed" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label="End date" sortKey="endDate" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-5 py-6 text-center text-muted">
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
                <td className="px-3 py-2.5 text-center tabular-nums">{formatHours(row.hoursPaid)}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{formatHours(row.consumed)}</td>
                <td className={`px-3 py-2.5 text-center tabular-nums font-medium ${row.remaining < 0 ? 'text-coral' : 'text-success'}`}>
                  {formatHours(row.remaining)}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums">{formatPercent(row.percentConsumed)}</td>
                <td className="px-3 py-2.5 text-center text-muted">
                  {row.endDate ? row.endDate.slice(0, 10) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-charcoal/20 font-semibold">
              <td className="px-5 py-3" colSpan={3}>
                Total
              </td>
              <td className="px-3 py-3 text-center tabular-nums">{formatHours(totals.hoursPaid)}</td>
              <td className="px-3 py-3 text-center tabular-nums">{formatHours(totals.consumed)}</td>
              <td className="px-3 py-3 text-center tabular-nums">{formatHours(totals.remaining)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}
