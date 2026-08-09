import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, List, Mail, Plus, Search, Trash2, User } from 'lucide-react';
import { useCreateCustomer, useCustomers, useDeleteCustomer } from '../../api/customers';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input, Select } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { TableStatusRow } from '../../components/ui/table-status-row';
import { ErrorState } from '../../components/ui/error-state';
import { Pagination } from '../../components/ui/pagination';
import { CustomerForm } from './CustomerForm';
import { useAuth, ApiRequestError } from '../../lib/auth';
import { useLanguage } from '../../lib/i18n';
import { cn } from '../../lib/utils';
import type { Customer } from '../../api/types';

type ViewMode = 'table' | 'cards';
const VIEW_STORAGE_KEY = 'customers.viewMode';

// View-toggle microcopy kept local to this component.
const VIEW_LABELS = {
  he: { table: 'טבלה', cards: 'כרטיסים', licensed: 'רישיון פעיל' },
  en: { table: 'Table', cards: 'Cards', licensed: 'Licensed' },
} as const;

export function CustomersList() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const labels = VIEW_LABELS[language];
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(VIEW_STORAGE_KEY) : null;
    return stored === 'cards' ? 'cards' : 'table';
  });

  function changeView(next: ViewMode) {
    setView(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  }
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
      onError: (err) => setDeleteError(err instanceof ApiRequestError ? err.message : t('common.failedToDelete')),
    });
  }

  return (
    <div>
      <PageHeader
        title={t('customers.title')}
        actions={
          canEdit && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> {t('customers.newCustomer')}
            </Button>
          )
        }
      />
      <div className="mb-4 flex gap-3">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder={t('customers.searchPlaceholder')}
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
          <option value="">{t('status.allStatuses')}</option>
          <option value="active">{t('status.active')}</option>
          <option value="prospect">{t('status.prospect')}</option>
          <option value="inactive">{t('status.inactive')}</option>
        </Select>
        <div className="ms-auto flex items-center gap-1 rounded-md border border-border bg-surface p-1">
          <button
            type="button"
            aria-label={labels.table}
            title={labels.table}
            aria-pressed={view === 'table'}
            onClick={() => changeView('table')}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded',
              view === 'table' ? 'bg-bg text-charcoal' : 'text-muted hover:text-charcoal',
            )}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={labels.cards}
            title={labels.cards}
            aria-pressed={view === 'cards'}
            onClick={() => changeView('cards')}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded',
              view === 'cards' ? 'bg-bg text-charcoal' : 'text-muted hover:text-charcoal',
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>
      {view === 'table' ? (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase text-muted">
                <th className="px-5 py-3 text-start font-medium">{t('customers.colName')}</th>
                <th className="px-5 py-3 text-start font-medium">{t('customers.colContact')}</th>
                <th className="px-5 py-3 text-start font-medium">{t('customers.colStatus')}</th>
                {canEdit && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody>
              <TableStatusRow
                colSpan={4}
                isLoading={isLoading}
                isError={isError}
                isEmpty={!isLoading && !isError && data?.items.length === 0}
                emptyMessage={t('customers.none')}
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
                    <Badge status={customer.status}>{t(`status.${customer.status}`)}</Badge>
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
      ) : (
        <>
          {isLoading && <Card className="px-5 py-10 text-center text-sm text-muted">{t('common.loading')}</Card>}
          {isError && (
            <Card>
              <ErrorState onRetry={refetch} />
            </Card>
          )}
          {!isLoading && !isError && data?.items.length === 0 && (
            <Card className="px-5 py-10 text-center text-sm text-muted">{t('customers.none')}</Card>
          )}
          {!isLoading && !isError && data && data.items.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.items.map((customer) => (
                <Card
                  key={customer.id}
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  className="relative flex cursor-pointer flex-col gap-3 p-5 transition hover:border-primary/40 hover:shadow-md"
                >
                  {canEdit && (
                    <button
                      type="button"
                      aria-label={t('common.delete')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteError(null);
                        setDeleteTarget(customer);
                      }}
                      className="absolute end-3 top-3 text-muted hover:text-coral"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <div className="flex items-start justify-between gap-3 pe-6">
                    <h3 className="font-semibold text-charcoal">{customer.name}</h3>
                  </div>
                  <Badge status={customer.status} className="w-fit">
                    {t(`status.${customer.status}`)}
                  </Badge>
                  <div className="mt-1 flex flex-col gap-1.5 text-sm text-muted">
                    <span className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      {customer.contactName || '—'}
                    </span>
                    {customer.contactEmail && (
                      <span className="flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{customer.contactEmail}</span>
                      </span>
                    )}
                  </div>
                  {customer.hasLicense && (
                    <span className="mt-auto w-fit rounded-full bg-bg px-2.5 py-1 text-xs font-medium text-charcoal">
                      {labels.licensed}
                    </span>
                  )}
                </Card>
              ))}
            </div>
          )}
          {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}
        </>
      )}
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
        title={t('customers.deleteTitle')}
        description={t('customers.deleteDescription', { name: deleteTarget?.name ?? '' })}
        error={deleteError}
        isSubmitting={deleteCustomer.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
