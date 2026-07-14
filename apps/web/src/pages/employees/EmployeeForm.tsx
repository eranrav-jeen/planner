import { useState, type FormEvent } from 'react';
import type { Employee, EmploymentType } from '../../api/types';
import type { EmployeeInput } from '../../api/employees';
import { Dialog } from '../../components/ui/dialog';
import { Field, Input, Select } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../lib/auth';

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
  const { user } = useAuth();
  const canSeeCost = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [form, setForm] = useState<EmployeeInput>(employee ?? emptyInput);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={employee ? 'Edit employee' : 'New employee'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name">
            <Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field label="Last name">
            <Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
        </div>
        <Field label="Email">
          <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Title">
            <Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Department">
            <Input value={form.department ?? ''} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employment type">
            <Select
              value={form.employmentType}
              onChange={(e) => setForm({ ...form, employmentType: e.target.value as EmploymentType })}
            >
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
              <option value="contractor">Contractor</option>
            </Select>
          </Field>
          <Field label="Monthly capacity (hours)">
            <Input
              type="number"
              min={0}
              value={form.monthlyCapacityHours}
              onChange={(e) => setForm({ ...form, monthlyCapacityHours: Number(e.target.value) })}
            />
          </Field>
        </div>
        {canSeeCost && (
          <Field label="Cost rate (hourly)">
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
          Active
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
