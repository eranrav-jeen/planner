import { Link } from 'react-router-dom';
import { CalendarClock, Wallet } from 'lucide-react';
import type { BidSummary, BidTimelineItem, WonBidPayments } from '../../api/bids';
import { Card } from '../../components/ui/card';
import { useLanguage } from '../../lib/i18n';
import { formatCurrency, useDateFormatter } from '../../lib/format';
import { cn } from '../../lib/utils';

const MS_PER_DAY = 86_400_000;

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / MS_PER_DAY);
}

// Urgency colour for a date that is `days` away.
function urgencyClass(days: number): string {
  if (days <= 3) return 'bg-coral';
  if (days <= 7) return 'bg-amber';
  return 'bg-lavender';
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function SectionTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-charcoal">
        {icon}
        {title}
      </h3>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

// Horizontal timeline: one column per date, pinned to a shared axis line.
function Timeline({ items, today }: { items: BidTimelineItem[]; today: string }) {
  const { t } = useLanguage();
  const formatDate = useDateFormatter();

  const groups: Array<{ date: string; items: BidTimelineItem[] }> = [];
  for (const it of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === it.date) last.items.push(it);
    else groups.push({ date: it.date, items: [it] });
  }

  const relative = (days: number) =>
    days === 0 ? t('bids.dash.today') : days === 1 ? t('bids.dash.tomorrow') : t('bids.dash.inDays', { n: days });

  return (
    <Card className="p-5">
      <SectionTitle icon={<CalendarClock className="h-4 w-4" />} title={t('bids.dash.timeline')} hint={t('bids.dash.timelineHint')} />
      {groups.length === 0 ? (
        <p className="text-sm text-muted">{t('bids.dash.noUpcoming')}</p>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 pb-1">
          <ol className="relative flex gap-3">
            {/* Axis line through the date dots. */}
            <span aria-hidden className="absolute inset-x-0 top-[2.875rem] h-px bg-border" />
            {groups.map((g) => {
              const days = daysBetween(today, g.date);
              return (
                <li key={g.date} className="relative min-w-44 max-w-64 flex-1">
                  <div className="h-9">
                    <div className={cn('text-xs font-semibold', days <= 3 ? 'text-coral' : 'text-charcoal')}>{relative(days)}</div>
                    <div className="text-xs text-muted tabular-nums">{formatDate(g.date)}</div>
                  </div>
                  <span
                    aria-hidden
                    className={cn('relative z-10 my-1 block h-3 w-3 rounded-full ring-4 ring-surface', urgencyClass(days))}
                  />
                  <ul className="mt-2 space-y-2">
                    {g.items.map((it) => (
                      <li key={it.stageId}>
                        <Link
                          to={`/bids/${it.bidId}`}
                          className="block rounded-lg border border-border bg-bg px-3 py-2 text-xs hover:border-charcoal/30"
                        >
                          <div className="font-medium text-charcoal">{it.label}</div>
                          <div className="mt-0.5 line-clamp-2 text-muted">{it.bidTitle}</div>
                          {it.notes && <div className="mt-0.5 text-muted tabular-nums">{it.notes}</div>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </Card>
  );
}

// Stacked bar: paid, then sent-but-unpaid, then not yet sent.
function PaymentBar({ total, sent, paid }: { total: number; sent: number; paid: number }) {
  const paidPct = pct(paid, total);
  const sentPct = Math.max(0, pct(sent, total) - paidPct);
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-border">
      <div className="h-full bg-success" style={{ width: `${paidPct}%` }} />
      <div className="h-full bg-amber" style={{ width: `${sentPct}%` }} />
    </div>
  );
}

function WonPayments({ bids, summary }: { bids: WonBidPayments[]; summary: BidSummary }) {
  const { t } = useLanguage();
  return (
    <Card className="p-5">
      <SectionTitle icon={<Wallet className="h-4 w-4" />} title={t('bids.dash.wonPayments')} hint={t('bids.dash.netNote')} />
      {bids.length === 0 ? (
        <p className="text-sm text-muted">{t('bids.dash.noWon')}</p>
      ) : (
        <>
          <ul className="grid gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
            {bids.map((b) => (
              <li key={b.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <Link to={`/bids/${b.id}`} className="min-w-0 truncate text-sm font-medium text-charcoal hover:underline">
                    {b.title}
                  </Link>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-charcoal">
                    {b.total > 0 ? t('bids.dash.paidPct', { pct: pct(b.paid, b.total) }) : '—'}
                  </span>
                </div>
                {b.total > 0 ? (
                  <>
                    <PaymentBar total={b.total} sent={b.sent} paid={b.paid} />
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted tabular-nums">
                      <span>
                        {t('bids.dash.legendPaid')}: {formatCurrency(b.paid, 'ILS')}
                      </span>
                      {b.sent > b.paid && (
                        <span>
                          {t('bids.dash.awaiting')}: {formatCurrency(b.sent - b.paid, 'ILS')}
                        </span>
                      )}
                      <span>
                        {t('bids.payment.total')}: {formatCurrency(b.total, 'ILS')}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted">{t('bids.dash.noPayments')}</p>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" /> {t('bids.dash.legendPaid')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber" /> {t('bids.dash.legendSent')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-border" /> {t('bids.dash.legendOpen')}
            </span>
            <span className="ms-auto font-medium text-charcoal tabular-nums">
              {t('bids.dash.paidPct', { pct: pct(summary.paymentsPaid, summary.paymentsTotal) })} ·{' '}
              {formatCurrency(summary.paymentsPaid, 'ILS')} / {formatCurrency(summary.paymentsTotal, 'ILS')}
            </span>
          </div>
        </>
      )}
    </Card>
  );
}

export function BidsDashboard({ summary }: { summary: BidSummary }) {
  return (
    <div className="mb-6 space-y-4">
      <Timeline items={summary.timeline} today={summary.today} />
      <WonPayments bids={summary.wonBids} summary={summary} />
    </div>
  );
}
