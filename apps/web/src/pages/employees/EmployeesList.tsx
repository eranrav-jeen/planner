import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useCreateEmployee, useEmployees, useDeleteEmployee } from '../../api/employees';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { TableStatusRow } from '../../components/ui/table-status-row';
import { Pagination } from '../../components/ui/pagination';
import { EmployeeForm } from './EmployeeForm';
import { useAuth, ApiRequestError } from '../../lib/auth';
import { useLanguage } from '../../lib/i18n';
import type { Employee } from '../../api/types';

export function EmployeesList() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useEmployees({ search, page: String(page) });
  const createEmployee = useCreateEmployee();
  const deleteEmployee = useDeleteEmployee();

  function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    deleteEmployee.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (err) => setDeleteError(err instanceof ApiRequestError ? err.message : t('common.failedToDelete')),
    });
  }

  return (
    <div>
      <PageHeader
        title={t('employees.title')}
        actions={
          canEdit && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> {t('employees.newEmployee')}
            </Button>
          )
        }
      />
      <div className="mb-4 flex gap-3">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder={t('employees.searchPlaceholder')}
            className="ps-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="px-5 py-3 text-start font-medium">{t('employees.colName')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('employees.colTitle')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('employees.colDepartment')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('employees.colCapacity')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('employees.colStatus')}</th>
              {canEdit && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody>
            <TableStatusRow
              colSpan={6}
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && data?.items.length === 0}
              emptyMessage={t('employees.none')}
              onRetry={refetch}
            />
            {data?.items.map((employee) => (
              <tr
                key={employee.id}
                onClick={() => navigate(`/employees/${employee.id}`)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-bg"
              >
                <td className="px-5 py-3 font-medium">
                  {employee.firstName} {employee.lastName}
                </td>
                <td className="px-5 py-3 text-muted">{employee.title || '—'}</td>
                <td className="px-5 py-3 text-muted">{employee.department || '—'}</td>
                <td className="px-5 py-3 tabular-nums">{employee.monthlyCapacityHours}h</td>
                <td className="px-5 py-3">
                  <Badge status={employee.isActive ? 'active' : 'inactive'}>
                    {employee.isActive ? t('common.active') : t('common.inactive')}
                  </Badge>
                </td>
                {canEdit && (
                  <td className="px-5 py-3 text-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteError(null);
                        setDeleteTarget(employee);
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
      <EmployeeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        isSubmitting={createEmployee.isPending}
        onSubmit={(input) => createEmployee.mutate(input, { onSuccess: () => setFormOpen(false) })}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('employees.deleteTitle')}
        description={t('employees.deleteDescription', {
          name: `${deleteTarget?.firstName ?? ''} ${deleteTarget?.lastName ?? ''}`,
        })}
        error={deleteError}
        isSubmitting={deleteEmployee.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
