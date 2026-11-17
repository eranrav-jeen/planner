import { useState, type FormEvent } from 'react';
import type { Bid, BidCoreInput, BidStatus } from '../../api/bids';
import { useProjects } from '../../api/projects';
import { Dialog } from '../../components/ui/dialog';
import { Field, Input, Select, Textarea } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useLanguage } from '../../lib/i18n';

const STATUSES: BidStatus[] = ['evaluating', 'applying', 'submitted', 'won', 'lost', 'no_bid'];

function toDateInput(v?: string | null) {
  return v ? v.slice(0, 10) : '';
}

function fromBid(bid?: Bid): BidCoreInput {
  return {
    title: bid?.title ?? '',
    issuer: bid?.issuer ?? '',
    description: bid?.description ?? '',
    status: bid?.status ?? 'evaluating',
    submissionDate: bid?.submissionDate ?? null,
    winProbability: bid?.winProbability ?? null,
    estimatedValue: bid?.estimatedValue ?? null,
    budgetNote: bid?.budgetNote ?? '',
    competitors: bid?.competitors ?? '',
    partners: bid?.partners ?? '',
    notes: bid?.notes ?? '',
    projectId: bid?.projectId ?? null,
  };
}

export function BidForm({
  open,
  onOpenChange,
  bid,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bid?: Bid;
  onSubmit: (input: BidCoreInput) => void;
  isSubmitting: boolean;
}) {
  const { t } = useLanguage();
  const { data: projects } = useProjects({});
  const [form, setForm] = useState<BidCoreInput>(fromBid(bid));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      ...form,
      winProbability: form.winProbability === null || Number.isNaN(form.winProbability) ? null : form.winProbability,
      estimatedValue: form.estimatedValue === null || Number.isNaN(form.estimatedValue) ? null : form.estimatedValue,
      projectId: form.projectId || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={bid ? t('bids.form.editTitle') : t('bids.form.newTitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('bids.form.title')}>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('bids.form.issuer')}>
            <Input value={form.issuer ?? ''} onChange={(e) => setForm({ ...form, issuer: e.target.value })} />
          </Field>
          <Field label={t('bids.form.status')}>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as BidStatus })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`bids.status.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t('bids.form.description')}>
          <Textarea rows={2} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('bids.form.submissionDate')}>
            <Input
              type="date"
              value={toDateInput(form.submissionDate)}
              onChange={(e) => setForm({ ...form, submissionDate: e.target.value || null })}
            />
          </Field>
          <Field label={t('bids.form.winProbability')}>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.winProbability ?? ''}
              onChange={(e) => setForm({ ...form, winProbability: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('bids.form.estimatedValue')}>
            <Input
              type="number"
              min={0}
              value={form.estimatedValue ?? ''}
              onChange={(e) => setForm({ ...form, estimatedValue: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </Field>
          <Field label={t('bids.form.budgetNote')}>
            <Input value={form.budgetNote ?? ''} onChange={(e) => setForm({ ...form, budgetNote: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('bids.form.competitors')}>
            <Textarea rows={2} value={form.competitors ?? ''} onChange={(e) => setForm({ ...form, competitors: e.target.value })} />
          </Field>
          <Field label={t('bids.form.partners')}>
            <Textarea rows={2} value={form.partners ?? ''} onChange={(e) => setForm({ ...form, partners: e.target.value })} />
          </Field>
        </div>
        <Field label={t('bids.form.project')}>
          <Select value={form.projectId ?? ''} onChange={(e) => setForm({ ...form, projectId: e.target.value || null })}>
            <option value="">{t('bids.form.noProject')}</option>
            {projects?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('bids.form.notes')}>
          <Textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
