import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useCreateCustomer, useCustomers } from '../../api/customers';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input, Select } from '../../components/ui/input';
import { CustomerForm } from './CustomerForm';
import { useAuth } from '../../lib/auth';

export function CustomersList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const { data, isLoading } = useCustomers({ search, status: status || undefined });
  const createCustomer = useCreateCustomer();

  return (
    <div>
      <PageHeader
        title="Customers"
        actions={
          canEdit && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> New customer
            </Button>
          )
        }
      />
      <div className="mb-4 flex gap-3">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search customers..."
            className="ps-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="prospect">Prospect</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-start text-xs uppercase text-muted">
              <th className="px-5 py-3 text-start font-medium">Name</th>
              <th className="px-5 py-3 text-start font-medium">Contact</th>
              <th className="px-5 py-3 text-start font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-muted">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-muted">
                  No customers yet.
                </td>
              </tr>
            )}
            {data?.items.map((customer) => (
              <tr
                key={customer.id}
                onClick={() => navigate(`/customers/${customer.id}`)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-bg"
              >
                <td className="px-5 py-3 font-medium text-charcoal">{customer.name}</td>
                <td className="px-5 py-3 text-muted">{customer.contactName || '—'}</td>
                <td className="px-5 py-3">
                  <Badge status={customer.status}>{customer.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        isSubmitting={createCustomer.isPending}
        onSubmit={(input) =>
          createCustomer.mutate(input, { onSuccess: () => setFormOpen(false) })
        }
      />
    </div>
  );
}
