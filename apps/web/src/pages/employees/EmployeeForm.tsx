import { useState, type FormEvent } from 'react';
import type { Employee, EmploymentType } from '../../api/types';
import type { EmployeeInput } from '../../api/employees';
import { Dialog } from '../../components/ui/dialog';
import { Field, Input, Select } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../lib/auth';
import { useLanguage } from '../../lib/i18n';

const emptyInput: EmployeeInput = {
  firstName: '',
  lastName: '',
  email: '',
  title: '',
  department: '',
  employmentType: 'full_time',
  monthlyCapacityHours: 186,
  costRateHourly: undefined,
  isActive: true,
  startDate: undefined,
};

export function EmployeeForm({
  open,
  onOpenChange,
  employee,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee;
  onSubmit: (input: EmployeeInput) => void;
  isSubmitting: boolean;
}) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const canSeeCost = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [form, setForm] = useState<EmployeeInput>(employee ?? emptyInput);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={employee ? t('employees.form.editTitle') : t('employees.form.newTitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('employees.form.firstName')}>
            <Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field label={t('employees.form.lastName')}>
            <Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
        </div>
        <Field label={t('employees.form.email')}>
          <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('employees.form.title')}>
            <Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label={t('employees.form.department')}>
            <Input value={form.department ?? ''} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('employees.form.employmentType')}>
            <Select
              value={form.employmentType}
              onChange={(e) => setForm({ ...form, employmentType: e.target.value as EmploymentType })}
            >
              <option value="full_time">{t('employment.full_time')}</option>
              <option value="part_time">{t('employment.part_time')}</option>
              <option value="contractor">{t('employment.contractor')}</option>
            </Select>
          </Field>
          <Field label={t('employees.form.monthlyCapacity')}>
            <Input
              type="number"
              min={0}
              value={form.monthlyCapacityHours}
              onChange={(e) => setForm({ ...form, monthlyCapacityHours: Number(e.target.value) })}
            />
          </Field>
        </div>
        {canSeeCost && (
          <Field label={t('employees.form.costRate')}>
            <Input
              type="number"
              min={0}
              value={form.costRateHourly ?? ''}
              onChange={(e) =>
                setForm({ ...form, costRateHourly: e.target.value ? Number(e.target.value) : null })
              }
            />
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          {t('employees.form.active')}
        </label>
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
