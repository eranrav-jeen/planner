import { useState, type FormEvent } from 'react';
import type { BillingType, Project, ProjectStatus } from '../../api/types';
import type { ProjectInput } from '../../api/projects';
import { useCustomers } from '../../api/customers';
import { Dialog } from '../../components/ui/dialog';
import { Field, Input, Select, Textarea } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useLanguage } from '../../lib/i18n';

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

function emptyInput(customerId = ''): ProjectInput {
  return {
    customerId,
    name: '',
    code: '',
    status: 'planning',
    startDate: undefined,
    endDate: undefined,
    incomeAmount: 0,
    hoursPaid: 0,
    currency: 'ILS',
    billingType: 'time_and_materials',
    description: '',
    githubRepoUrl: '',
    jiraBoardUrl: '',
  };
}

export function ProjectForm({
  open,
  onOpenChange,
  project,
  defaultCustomerId,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  defaultCustomerId?: string;
  onSubmit: (input: ProjectInput) => void;
  isSubmitting: boolean;
}) {
  const { t } = useLanguage();
  const { data: customers } = useCustomers();
  const [form, setForm] = useState<ProjectInput>(
    project
      ? {
          customerId: project.customerId,
          name: project.name,
          code: project.code,
          status: project.status,
          startDate: project.startDate,
          endDate: project.endDate,
          incomeAmount: project.incomeAmount,
          hoursPaid: project.hoursPaid,
          currency: project.currency,
          billingType: project.billingType,
          description: project.description,
          githubRepoUrl: project.githubRepoUrl,
          jiraBoardUrl: project.jiraBoardUrl,
        }
      : emptyInput(defaultCustomerId),
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={project ? t('projects.form.editTitle') : t('projects.form.newTitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('projects.form.name')}>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t('projects.form.code')}>
            <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
        </div>
        <Field label={t('projects.form.customer')}>
          <Select
            required
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
          >
            <option value="" disabled>
              {t('projects.form.selectCustomer')}
            </option>
            {customers?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('projects.form.status')}>
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
            >
              <option value="planning">{t('status.planning')}</option>
              <option value="active">{t('status.active')}</option>
              <option value="on_hold">{t('status.on_hold')}</option>
              <option value="completed">{t('status.completed')}</option>
              <option value="cancelled">{t('status.cancelled')}</option>
            </Select>
          </Field>
          <Field label={t('projects.form.billingType')}>
            <Select
              value={form.billingType}
              onChange={(e) => setForm({ ...form, billingType: e.target.value as BillingType })}
            >
              <option value="time_and_materials">{t('billing.time_and_materials')}</option>
              <option value="fixed_price">{t('billing.fixed_price')}</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('projects.form.startDate')}>
            <Input
              type="date"
              value={toDateInput(form.startDate)}
              onChange={(e) => setForm({ ...form, startDate: e.target.value || null })}
            />
          </Field>
          <Field label={t('projects.form.endDate')}>
            <Input
              type="date"
              value={toDateInput(form.endDate)}
              onChange={(e) => setForm({ ...form, endDate: e.target.value || null })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('projects.form.incomeAmount')}>
            <Input
              type="number"
              min={0}
              value={form.incomeAmount}
              onChange={(e) => setForm({ ...form, incomeAmount: Number(e.target.value) })}
            />
          </Field>
          <Field label={t('projects.form.hoursPaid')}>
            <Input
              type="number"
              min={0}
              value={form.hoursPaid}
              onChange={(e) => setForm({ ...form, hoursPaid: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label={t('projects.form.currency')}>
          <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
        </Field>
        <Field label={t('projects.form.description')}>
          <Textarea
            rows={3}
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('projects.form.githubRepo')}>
            <Input
              type="url"
              placeholder="https://github.com/org/repo"
              value={form.githubRepoUrl ?? ''}
              onChange={(e) => setForm({ ...form, githubRepoUrl: e.target.value })}
            />
          </Field>
          <Field label={t('projects.form.jiraBoard')}>
            <Input
              type="url"
              placeholder="https://jeen.atlassian.net/jira/software/projects/..."
              value={form.jiraBoardUrl ?? ''}
              onChange={(e) => setForm({ ...form, jiraBoardUrl: e.target.value })}
            />
          </Field>
        </div>
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
