import { useState, type FormEvent } from 'react';
import type { Customer, CustomerStatus } from '../../api/types';
import type { CustomerInput } from '../../api/customers';
import { Dialog } from '../../components/ui/dialog';
import { Field, Input, Select, Textarea } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

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
  const [form, setForm] = useState<CustomerInput>(customer ?? emptyInput);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={customer ? 'Edit customer' : 'New customer'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name">
          <Input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact name">
            <Input
              value={form.contactName ?? ''}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            />
          </Field>
          <Field label="Contact email">
            <Input
              type="email"
              value={form.contactEmail ?? ''}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Status">
          <Select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as CustomerStatus })}
          >
            <option value="active">Active</option>
            <option value="prospect">Prospect</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
        <Field label="Notes">
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
            Has Jeen product license
          </label>

          {form.hasLicense && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Annual license amount">
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
                    Current period paid
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Current period start">
                  <Input
                    type="date"
                    value={toDateInput(form.licensePeriodStart)}
                    onChange={(e) => setForm({ ...form, licensePeriodStart: e.target.value || null })}
                  />
                </Field>
                <Field label="Current period end">
                  <Input
                    type="date"
                    value={toDateInput(form.licensePeriodEnd)}
                    onChange={(e) => setForm({ ...form, licensePeriodEnd: e.target.value || null })}
                  />
                </Field>
              </div>
            </>
          )}
        </div>

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
