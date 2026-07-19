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
import { TableStatusRow } from '../../components/ui/table-status-row';
import { useLanguage } from '../../lib/i18n';
import type { ProjectBurnRow } from '../../api/reports';

export function ProjectBurnReport() {
  const { t } = useLanguage();
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('');
  const { data: customersData } = useCustomers();
  const { data, isLoading, isError, refetch } = useProjectBurnReport({
    customerId: customerId || undefined,
    status: status || undefined,
  });
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
            <option value="">{t('reports.allCustomers')}</option>
            {customersData?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select className="w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('status.allStatuses')}</option>
            <option value="planning">{t('status.planning')}</option>
            <option value="active">{t('status.active')}</option>
            <option value="on_hold">{t('status.on_hold')}</option>
            <option value="completed">{t('status.completed')}</option>
            <option value="cancelled">{t('status.cancelled')}</option>
          </Select>
        </div>
        <ExportButton
          report="project-burn"
          params={{ customerId: customerId || undefined, status: status || undefined }}
        />
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <SortHeader label={t('reports.burn.colProject')} sortKey="projectName" activeKey={sortKey} dir={sortDir} onClick={toggle} />
              <SortHeader label={t('reports.burn.colCustomer')} sortKey="customerName" activeKey={sortKey} dir={sortDir} onClick={toggle} />
              <SortHeader label={t('reports.burn.colStatus')} sortKey="status" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label={t('reports.burn.colPaid')} sortKey="hoursPaid" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label={t('reports.burn.colConsumed')} sortKey="consumed" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label={t('reports.burn.colRemaining')} sortKey="remaining" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label={t('reports.burn.colPercentUsed')} sortKey="percentConsumed" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
              <SortHeader label={t('reports.burn.colEndDate')} sortKey="endDate" activeKey={sortKey} dir={sortDir} onClick={toggle} align="center" />
            </tr>
          </thead>
          <tbody>
            <TableStatusRow
              colSpan={8}
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && (data?.rows.length ?? 0) === 0}
              emptyMessage={t('reports.burn.none')}
              onRetry={refetch}
            />
            {sorted.map((row) => (
              <tr key={row.projectId} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5 font-medium">
                  {row.projectName} <span className="text-muted">({row.projectCode})</span>
                </td>
                <td className="px-3 py-2.5 text-muted">{row.customerName}</td>
                <td className="px-3 py-2.5 text-center">
                  <Badge status={row.status}>{t(`status.${row.status}`)}</Badge>
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
                {t('reports.burn.total')}
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
