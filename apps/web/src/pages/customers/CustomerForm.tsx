import { useState, type FormEvent } from 'react';
import type { Customer, CustomerStatus } from '../../api/types';
import type { CustomerInput } from '../../api/customers';
import { Dialog } from '../../components/ui/dialog';
import { Field, Input, Select, Textarea } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { AI_MODEL_GROUPS, ALL_CURATED_MODELS, LICENSE_PLATFORM_VERSIONS } from '../../lib/licenseOptions';
import { useLanguage } from '../../lib/i18n';

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

const emptyInput: CustomerInput = {
  name: '',
  contactName: '',
  contactEmail: '',
  status: 'prospect',
  notes: '',
  hasLicense: false,
  licenseAnnualAmount: null,
  licensePeriodStart: null,
  licensePeriodEnd: null,
  licensePaid: false,
  licensePlatformVersion: null,
  licenseModelsInstalled: [],
};

export function CustomerForm({
  open,
  onOpenChange,
  customer,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  onSubmit: (input: CustomerInput) => void;
  isSubmitting: boolean;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState<CustomerInput>(customer ?? emptyInput);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    () => new Set((customer?.licenseModelsInstalled ?? []).filter((m) => ALL_CURATED_MODELS.has(m))),
  );
  const [otherModelsText, setOtherModelsText] = useState(() =>
    (customer?.licenseModelsInstalled ?? []).filter((m) => !ALL_CURATED_MODELS.has(m)).join(', '),
  );

  function toggleModel(model: string) {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(model)) next.delete(model);
      else next.add(model);
      return next;
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const otherModels = otherModelsText
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    onSubmit({ ...form, licenseModelsInstalled: [...selectedModels, ...otherModels] });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={customer ? t('customers.form.editTitle') : t('customers.form.newTitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('customers.form.name')}>
          <Input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('customers.form.contactName')}>
            <Input
              value={form.contactName ?? ''}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            />
          </Field>
          <Field label={t('customers.form.contactEmail')}>
            <Input
              type="email"
              value={form.contactEmail ?? ''}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            />
          </Field>
        </div>
        <Field label={t('customers.form.status')}>
          <Select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as CustomerStatus })}
          >
            <option value="active">{t('status.active')}</option>
            <option value="prospect">{t('status.prospect')}</option>
            <option value="inactive">{t('status.inactive')}</option>
          </Select>
        </Field>
        <Field label={t('customers.form.notes')}>
          <Textarea
            rows={3}
            value={form.notes ?? ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.hasLicense}
              onChange={(e) => setForm({ ...form, hasLicense: e.target.checked })}
            />
            {t('customers.form.hasLicense')}
          </label>

          {form.hasLicense && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('customers.form.annualLicenseAmount')}>
                  <Input
                    type="number"
                    min={0}
                    value={form.licenseAnnualAmount ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        licenseAnnualAmount: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </Field>
                <div className="flex items-end pb-1.5">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.licensePaid}
                      onChange={(e) => setForm({ ...form, licensePaid: e.target.checked })}
                    />
                    {t('customers.form.currentPeriodPaid')}
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('customers.form.periodStart')}>
                  <Input
                    type="date"
                    value={toDateInput(form.licensePeriodStart)}
                    onChange={(e) => setForm({ ...form, licensePeriodStart: e.target.value || null })}
                  />
                </Field>
                <Field label={t('customers.form.periodEnd')}>
                  <Input
                    type="date"
                    value={toDateInput(form.licensePeriodEnd)}
                    onChange={(e) => setForm({ ...form, licensePeriodEnd: e.target.value || null })}
                  />
                </Field>
              </div>
              <Field label={t('customers.form.platformVersion')}>
                <Select
                  value={form.licensePlatformVersion ?? ''}
                  onChange={(e) => setForm({ ...form, licensePlatformVersion: e.target.value || null })}
                >
                  <option value="">{t('customers.form.unknown')}</option>
                  {LICENSE_PLATFORM_VERSIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <div>
                <span className="mb-1.5 block text-sm font-medium text-charcoal">
                  {t('customers.form.modelsInstalled')}
                </span>
                <div className="space-y-3 rounded-lg border border-border p-3">
                  {AI_MODEL_GROUPS.map((group) => (
                    <div key={group.vendor}>
                      <div className="mb-1 text-xs font-medium uppercase text-muted">{group.vendor}</div>
                      <div className="grid grid-cols-2 gap-1">
                        {group.models.map((model) => (
                          <label key={model} className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedModels.has(model)}
                              onChange={() => toggleModel(model)}
                            />
                            {model}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Field label={t('customers.form.otherModels')}>
                    <Input
                      value={otherModelsText}
                      onChange={(e) => setOtherModelsText(e.target.value)}
                      placeholder="e.g. Internal-LLM-v2"
                    />
                  </Field>
                </div>
              </div>
            </>
          )}
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
