import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useBids, useBidsSummary, useCreateBid, type BidListRow, type BidStatus } from '../../api/bids';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { TableStatusRow } from '../../components/ui/table-status-row';
import { useLanguage } from '../../lib/i18n';
import { formatCurrency, useDateFormatter } from '../../lib/format';
import { cn } from '../../lib/utils';
import { BidForm } from './BidForm';
import { BidsDashboard } from './BidsDashboard';

const STATUS_ORDER: BidStatus[] = ['evaluating', 'applying', 'submitted', 'won', 'lost', 'no_bid'];

export function bidStatusClass(status: BidStatus): string {
  switch (status) {
    case 'won':
      return 'bg-success/10 text-success';
    case 'submitted':
    case 'applying':
      return 'bg-lavender/30 text-charcoal';
    case 'evaluating':
      return 'bg-amber/20 text-charcoal';
    case 'lost':
      return 'bg-coral/15 text-coral';
    default:
      return 'bg-border text-muted';
  }
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-charcoal">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </Card>
  );
}

export function BidsList() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const formatDate = useDateFormatter();
  const { data: summary } = useBidsSummary();
  const { data: bids, isLoading, isError, refetch } = useBids();
  const createBid = useCreateBid();
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title={t('bids.title')}
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> {t('bids.new')}
          </Button>
        }
      />

      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={t('bids.dash.pipeline')}
            value={formatCurrency(summary.pipelineValue, 'ILS')}
            sub={`${(summary.byStatus.evaluating ?? 0) + (summary.byStatus.applying ?? 0) + (summary.byStatus.submitted ?? 0)} ${t('bids.title')}`}
          />
          <StatCard label={t('bids.dash.weighted')} value={formatCurrency(summary.weightedValue, 'ILS')} />
          <StatCard
            label={t('bids.dash.won')}
            value={formatCurrency(summary.wonValue, 'ILS')}
            sub={`${summary.byStatus.won ?? 0} ${t('bids.status.won')}`}
          />
          <StatCard
            label={t('bids.dash.payments')}
            value={`${formatCurrency(summary.paymentsPaid, 'ILS')} / ${formatCurrency(summary.paymentsTotal, 'ILS')}`}
            sub={
              <span className="flex flex-wrap gap-x-2">
                <span>
                  {t('bids.dash.awaiting')}: {formatCurrency(summary.paymentsAwaiting, 'ILS')}
                </span>
                <span>
                  {t('bids.dash.outstanding')}: {formatCurrency(summary.paymentsOutstanding, 'ILS')}
                </span>
              </span>
            }
          />
        </div>
      )}

      {summary && <BidsDashboard summary={summary} />}

      {summary && (
        <div className="mb-6 flex flex-wrap gap-2">
          {STATUS_ORDER.filter((s) => (summary.byStatus[s] ?? 0) > 0).map((s) => (
            <span key={s} className={cn('rounded-full px-3 py-1 text-xs font-medium', bidStatusClass(s))}>
              {t(`bids.status.${s}`)}: {summary.byStatus[s]}
            </span>
          ))}
        </div>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="px-5 py-3 text-start font-medium">{t('bids.col.title')}</th>
              <th className="px-3 py-3 text-start font-medium">{t('bids.col.status')}</th>
              <th className="px-3 py-3 text-start font-medium">{t('bids.col.deadline')}</th>
              <th className="px-3 py-3 text-center font-medium">{t('bids.col.winProb')}</th>
              <th className="px-3 py-3 text-end font-medium">{t('bids.col.value')}</th>
              <th className="px-3 py-3 text-center font-medium">{t('bids.col.progress')}</th>
              <th className="px-3 py-3 text-start font-medium">{t('bids.col.nextStep')}</th>
            </tr>
          </thead>
          <tbody>
            <TableStatusRow
              colSpan={7}
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && (bids?.length ?? 0) === 0}
              emptyMessage={t('bids.none')}
              onRetry={refetch}
            />
            {bids?.map((bid: BidListRow) => (
              <tr
                key={bid.id}
                onClick={() => navigate(`/bids/${bid.id}`)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-bg"
              >
                <td className="px-5 py-3">
                  <div className="font-medium text-charcoal">{bid.title}</div>
                  {bid.issuer && <div className="text-xs text-muted">{bid.issuer}</div>}
                </td>
                <td className="px-3 py-3">
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', bidStatusClass(bid.status))}>
                    {t(`bids.status.${bid.status}`)}
                  </span>
                </td>
                <td className="px-3 py-3 text-muted">{bid.submissionDate ? formatDate(bid.submissionDate) : '—'}</td>
                <td className="px-3 py-3 text-center tabular-nums">
                  {bid.winProbability != null ? `${bid.winProbability}%` : '—'}
                </td>
                <td className="px-3 py-3 text-end tabular-nums">
                  {bid.estimatedValue != null ? formatCurrency(bid.estimatedValue, 'ILS') : '—'}
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-muted">
                  {bid.stagesDone}/{bid.stagesTotal}
                </td>
                <td className="px-3 py-3 text-muted">
                  {bid.nextStageLabel ? (
                    <>
                      {bid.nextStageLabel}
                      {bid.nextStageDate && <span className="text-xs"> · {formatDate(bid.nextStageDate)}</span>}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <BidForm
        open={formOpen}
        onOpenChange={setFormOpen}
        isSubmitting={createBid.isPending}
        onSubmit={(input) =>
          createBid.mutate(input, { onSuccess: (bid) => { setFormOpen(false); navigate(`/bids/${bid.id}`); } })
        }
      />
    </div>
  );
}
