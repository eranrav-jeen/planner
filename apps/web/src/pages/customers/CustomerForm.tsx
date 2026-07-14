import { useState, type FormEvent } from 'react';
import type { Customer, CustomerStatus } from '../../api/types';
import type { CustomerInput } from '../../api/customers';
import { Dialog } from '../../components/ui/dialog';
import { Field, Input, Select, Textarea } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

const emptyInput: CustomerInput = {
  name: '',
  contactName: '',
  contactEmail: '',
  status: 'prospect',
  notes: '',
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
