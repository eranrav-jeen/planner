import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  useBid,
  useDeleteBid,
  useReplacePayments,
  useReplaceScoring,
  useReplaceStages,
  useReplaceThresholds,
  useUpdateBid,
  type Bid,
  type BidStageStatus,
  type PaymentInput,
  type ScoringInput,
  type StageInput,
  type ThresholdInput,
} from '../../api/bids';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input, Select } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { ErrorState } from '../../components/ui/error-state';
import { useLanguage } from '../../lib/i18n';
import { formatCurrency, useDateFormatter } from '../../lib/format';
import { cn } from '../../lib/utils';
import { ApiRequestError } from '../../lib/auth';
import { BidForm } from './BidForm';
import { bidStatusClass } from './BidsList';

const STAGE_STATUSES: BidStageStatus[] = ['pending', 'done', 'skipped'];

function SectionShell({
  title,
  onAdd,
  onSave,
  saving,
  children,
}: {
  title: string;
  onAdd: () => void;
  onSave: () => void;
  saving: boolean;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="sm" onClick={onSave} disabled={saving}>
            {t('common.save')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-muted hover:text-coral">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function StagesSection({ bid }: { bid: Bid }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<StageInput[]>(bid.stages.map((s) => ({ label: s.label, dueDate: s.dueDate, status: s.status, notes: s.notes })));
  const replace = useReplaceStages(bid.id);
  const up = (i: number, patch: Partial<StageInput>) => setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <SectionShell
      title={t('bids.sections.timeline')}
      onAdd={() => setItems([...items, { label: '', dueDate: null, status: 'pending', notes: null }])}
      onSave={() => replace.mutate(items.filter((i) => i.label.trim()))}
      saving={replace.isPending}
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted">{t('bids.noRows')}</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input className="flex-1" value={it.label} placeholder={t('bids.stage.colLabel')} onChange={(e) => up(i, { label: e.target.value })} />
              <Input className="w-40" type="date" value={it.dueDate ?? ''} onChange={(e) => up(i, { dueDate: e.target.value || null })} />
              <Select className="w-32" value={it.status} onChange={(e) => up(i, { status: e.target.value as BidStageStatus })}>
                {STAGE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`bids.stageStatus.${s}`)}
                  </option>
                ))}
              </Select>
              <RemoveBtn onClick={() => setItems(items.filter((_, idx) => idx !== i))} />
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function ThresholdsSection({ bid }: { bid: Bid }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<ThresholdInput[]>(bid.thresholds.map((x) => ({ label: x.label, met: x.met, notes: x.notes })));
  const replace = useReplaceThresholds(bid.id);
  const up = (i: number, patch: Partial<ThresholdInput>) => setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <SectionShell
      title={t('bids.sections.thresholds')}
      onAdd={() => setItems([...items, { label: '', met: false, notes: null }])}
      onSave={() => replace.mutate(items.filter((i) => i.label.trim()))}
      saving={replace.isPending}
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted">{t('bids.noRows')}</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={it.met} onChange={(e) => up(i, { met: e.target.checked })} />
                <span className="text-xs text-muted">{t('bids.threshold.met')}</span>
              </label>
              <Input className="flex-1" value={it.label} placeholder={t('bids.threshold.colLabel')} onChange={(e) => up(i, { label: e.target.value })} />
              <RemoveBtn onClick={() => setItems(items.filter((_, idx) => idx !== i))} />
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function ScoringSection({ bid }: { bid: Bid }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<ScoringInput[]>(
    bid.scoringCriteria.map((x) => ({ label: x.label, weight: x.weight, ourScore: x.ourScore, notes: x.notes })),
  );
  const replace = useReplaceScoring(bid.id);
  const up = (i: number, patch: Partial<ScoringInput>) => setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const weightSum = Math.round(items.reduce((s, i) => s + (i.weight || 0), 0) * 10) / 10;
  const weightedScore = Math.round(items.reduce((s, i) => s + (i.weight || 0) * ((i.ourScore ?? 0) / 100), 0) * 10) / 10;
  return (
    <SectionShell
      title={t('bids.sections.scoring')}
      onAdd={() => setItems([...items, { label: '', weight: 0, ourScore: null, notes: null }])}
      onSave={() => replace.mutate(items.filter((i) => i.label.trim()))}
      saving={replace.isPending}
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted">{t('bids.noRows')}</p>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input className="flex-1" value={it.label} placeholder={t('bids.scoring.colLabel')} onChange={(e) => up(i, { label: e.target.value })} />
                <Input className="w-24" type="number" min={0} max={100} value={it.weight} placeholder={t('bids.scoring.weight')} onChange={(e) => up(i, { weight: Number(e.target.value) })} />
                <Input className="w-24" type="number" min={0} max={100} value={it.ourScore ?? ''} placeholder={t('bids.scoring.ourScore')} onChange={(e) => up(i, { ourScore: e.target.value === '' ? null : Number(e.target.value) })} />
                <RemoveBtn onClick={() => setItems(items.filter((_, idx) => idx !== i))} />
              </div>
            ))}
          </div>
          <p className={cn('mt-3 text-xs', weightSum === 100 ? 'text-muted' : 'text-amber')}>
            {t('bids.scoring.weightSum', { sum: weightSum })} · {t('bids.scoring.weightedScore', { score: weightedScore })}
          </p>
        </>
      )}
    </SectionShell>
  );
}

function PaymentsSection({ bid }: { bid: Bid }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<PaymentInput[]>(
    bid.payments.map((p) => ({ label: p.label, amount: p.amount, dueDate: p.dueDate, paid: p.paid, paidDate: p.paidDate, poNumber: p.poNumber, notes: p.notes })),
  );
  const replace = useReplacePayments(bid.id);
  const up = (i: number, patch: Partial<PaymentInput>) => setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const total = items.reduce((s, i) => s + (i.amount || 0), 0);
  const paid = items.filter((i) => i.paid).reduce((s, i) => s + (i.amount || 0), 0);
  return (
    <SectionShell
      title={t('bids.sections.payments')}
      onAdd={() => setItems([...items, { label: '', amount: 0, dueDate: null, paid: false, paidDate: null, poNumber: null, notes: null }])}
      onSave={() => replace.mutate(items.filter((i) => i.label.trim()))}
      saving={replace.isPending}
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted">{t('bids.noRows')}</p>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <Input className="min-w-40 flex-1" value={it.label} placeholder={t('bids.payment.colLabel')} onChange={(e) => up(i, { label: e.target.value })} />
                <Input className="w-28" type="number" min={0} value={it.amount} placeholder={t('bids.payment.amount')} onChange={(e) => up(i, { amount: Number(e.target.value) })} />
                <Input className="w-28" value={it.poNumber ?? ''} placeholder={t('bids.payment.poNumber')} onChange={(e) => up(i, { poNumber: e.target.value || null })} />
                <Input className="w-36" type="date" value={it.dueDate ?? ''} title={t('bids.payment.due')} onChange={(e) => up(i, { dueDate: e.target.value || null })} />
                <label className="flex items-center gap-1 text-xs text-muted">
                  <input type="checkbox" checked={it.paid} onChange={(e) => up(i, { paid: e.target.checked, paidDate: e.target.checked ? it.paidDate ?? new Date().toISOString().slice(0, 10) : it.paidDate })} />
                  {t('bids.payment.paid')}
                </label>
                <Input className="w-36" type="date" value={it.paidDate ?? ''} title={t('bids.payment.paidDate')} onChange={(e) => up(i, { paidDate: e.target.value || null })} />
                <RemoveBtn onClick={() => setItems(items.filter((_, idx) => idx !== i))} />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            {t('bids.payment.total')}: {formatCurrency(total, 'ILS')} · {t('bids.payment.paidOf', { paid: formatCurrency(paid, 'ILS'), total: formatCurrency(total, 'ILS') })}
          </p>
        </>
      )}
    </SectionShell>
  );
}

export function BidDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const formatDate = useDateFormatter();
  const { data: bid, isLoading, isError, refetch } = useBid(id);
  const updateBid = useUpdateBid(id!);
  const deleteBid = useDeleteBid();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (isLoading) return <div className="text-sm text-muted">{t('common.loading')}</div>;
  if (isError || !bid) return <ErrorState onRetry={refetch} />;

  return (
    <div>
      <button type="button" onClick={() => navigate('/bids')} className="mb-3 text-sm text-muted hover:text-charcoal">
        {t('bids.backToList')}
      </button>
      <PageHeader
        title={bid.title}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setFormOpen(true)}>
              <Pencil className="h-4 w-4" /> {t('common.edit')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteError(null);
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" /> {t('common.delete')}
            </Button>
          </div>
        }
      />

      <Card className="mb-6">
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 py-4 text-sm lg:grid-cols-3">
          <div>
            <span className="text-muted">{t('bids.col.status')}: </span>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', bidStatusClass(bid.status))}>{t(`bids.status.${bid.status}`)}</span>
          </div>
          <div>
            <span className="text-muted">{t('bids.form.issuer')}: </span>
            {bid.issuer || '—'}
          </div>
          <div>
            <span className="text-muted">{t('bids.col.deadline')}: </span>
            {bid.submissionDate ? formatDate(bid.submissionDate) : '—'}
          </div>
          <div>
            <span className="text-muted">{t('bids.col.winProb')}: </span>
            {bid.winProbability != null ? `${bid.winProbability}%` : '—'}
          </div>
          <div>
            <span className="text-muted">{t('bids.form.estimatedValue')}: </span>
            {bid.estimatedValue != null ? formatCurrency(bid.estimatedValue, 'ILS') : '—'}
            {bid.budgetNote && <span className="text-muted"> · {bid.budgetNote}</span>}
          </div>
          {bid.project && (
            <div>
              <span className="text-muted">{t('bids.form.project')}: </span>
              <button type="button" onClick={() => navigate(`/projects/${bid.project!.id}`)} className="inline-flex items-center gap-1 text-charcoal hover:underline">
                <Link2 className="h-3 w-3" /> {bid.project.name} ({bid.project.code})
              </button>
            </div>
          )}
          {bid.description && <div className="col-span-2 lg:col-span-3"><span className="text-muted">{t('bids.form.description')}: </span>{bid.description}</div>}
          {bid.competitors && <div className="col-span-2 lg:col-span-3"><span className="text-muted">{t('bids.form.competitors')}: </span>{bid.competitors}</div>}
          {bid.partners && <div className="col-span-2 lg:col-span-3"><span className="text-muted">{t('bids.form.partners')}: </span>{bid.partners}</div>}
          {bid.notes && <div className="col-span-2 lg:col-span-3"><span className="text-muted">{t('bids.form.notes')}: </span>{bid.notes}</div>}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <StagesSection key={`st-${bid.stages.map((s) => s.id).join('|')}`} bid={bid} />
        <ThresholdsSection key={`th-${bid.thresholds.map((s) => s.id).join('|')}`} bid={bid} />
        <ScoringSection key={`sc-${bid.scoringCriteria.map((s) => s.id).join('|')}`} bid={bid} />
        <PaymentsSection key={`pm-${bid.payments.map((s) => s.id).join('|')}`} bid={bid} />
      </div>

      <BidForm
        open={formOpen}
        onOpenChange={setFormOpen}
        bid={bid}
        isSubmitting={updateBid.isPending}
        onSubmit={(input) => updateBid.mutate(input, { onSuccess: () => setFormOpen(false) })}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('bids.deleteTitle')}
        description={t('bids.deleteDescription', { name: bid.title })}
        error={deleteError}
        isSubmitting={deleteBid.isPending}
        onConfirm={() =>
          deleteBid.mutate(bid.id, {
            onSuccess: () => navigate('/bids'),
            onError: (err) => setDeleteError(err instanceof ApiRequestError ? err.message : t('common.failedToDelete')),
          })
        }
      />
    </div>
  );
}
