import { useState, type FormEvent } from 'react';
import type { BillingType, Project, ProjectStatus } from '../../api/types';
import type { ProjectInput } from '../../api/projects';
import { useCustomers } from '../../api/customers';
import { Dialog } from '../../components/ui/dialog';
import { Field, Input, Select, Textarea } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

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
        }
      : emptyInput(defaultCustomerId),
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={project ? 'Edit project' : 'New project'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Code">
            <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
        </div>
        <Field label="Customer">
          <Select
            required
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
          >
            <option value="" disabled>
              Select customer
            </option>
            {customers?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
          <Field label="Billing type">
            <Select
              value={form.billingType}
              onChange={(e) => setForm({ ...form, billingType: e.target.value as BillingType })}
            >
              <option value="time_and_materials">Time & materials</option>
              <option value="fixed_price">Fixed price</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start date">
            <Input
              type="date"
              value={toDateInput(form.startDate)}
              onChange={(e) => setForm({ ...form, startDate: e.target.value || null })}
            />
          </Field>
          <Field label="End date">
            <Input
              type="date"
              value={toDateInput(form.endDate)}
              onChange={(e) => setForm({ ...form, endDate: e.target.value || null })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Income amount">
            <Input
              type="number"
              min={0}
              value={form.incomeAmount}
              onChange={(e) => setForm({ ...form, incomeAmount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Hours paid">
            <Input
              type="number"
              min={0}
              value={form.hoursPaid}
              onChange={(e) => setForm({ ...form, hoursPaid: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Currency">
          <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
        </Field>
        <Field label="Description">
          <Textarea
            rows={3}
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
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
