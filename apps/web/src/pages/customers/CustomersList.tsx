import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useCreateCustomer, useCustomers, useDeleteCustomer } from '../../api/customers';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input, Select } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { TableStatusRow } from '../../components/ui/table-status-row';
import { Pagination } from '../../components/ui/pagination';
import { CustomerForm } from './CustomerForm';
import { useAuth, ApiRequestError } from '../../lib/auth';
import type { Customer } from '../../api/types';

export function CustomersList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useCustomers({
    search,
    status: status || undefined,
    page: String(page),
  });
  const createCustomer = useCreateCustomer();
  const deleteCustomer = useDeleteCustomer();

  function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    deleteCustomer.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (err) => setDeleteError(err instanceof ApiRequestError ? err.message : 'Failed to delete'),
    });
  }

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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-44"
        >
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
              {canEdit && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody>
            <TableStatusRow
              colSpan={4}
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && data?.items.length === 0}
              emptyMessage="No customers yet."
              onRetry={refetch}
            />
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
                {canEdit && (
                  <td className="px-5 py-3 text-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteError(null);
                        setDeleteTarget(customer);
                      }}
                      className="text-muted hover:text-coral"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}
      </Card>
      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        isSubmitting={createCustomer.isPending}
        onSubmit={(input) =>
          createCustomer.mutate(input, { onSuccess: () => setFormOpen(false) })
        }
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete customer"
        description={`Permanently delete "${deleteTarget?.name}"? This cannot be undone.`}
        error={deleteError}
        isSubmitting={deleteCustomer.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
