import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, ArrowRight, Trash2 } from 'lucide-react';
import { useCustomer, useUpdateCustomer, useDeleteCustomer } from '../../api/customers';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { ErrorState } from '../../components/ui/error-state';
import { CustomerForm } from './CustomerForm';
import { useAuth, ApiRequestError } from '../../lib/auth';
import { useLanguage } from '../../lib/i18n';
import { formatCurrency, formatHours, useDateFormatter } from '../../lib/format';

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const { data: customer, isLoading, isError, refetch } = useCustomer(id);
  const formatDate = useDateFormatter();
  const updateCustomer = useUpdateCustomer(id!);
  const deleteCustomer = useDeleteCustomer();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (isLoading) {
    return <div className="text-sm text-muted">{t('common.loading')}</div>;
  }
  if (isError || !customer) {
    return <ErrorState message={t('customers.couldNotLoad')} onRetry={refetch} />;
  }

  const projects = customer.projects ?? [];
  const totalIncome = projects.reduce((sum, p) => sum + Number(p.incomeAmount), 0);
  const totalHoursPaid = projects.reduce((sum, p) => sum + Number(p.hoursPaid), 0);
  const activeCount = projects.filter((p) => p.status === 'active').length;

  return (
    <div>
      <PageHeader
        title={customer.name}
        actions={
          canEdit && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setFormOpen(true)}>
                <Pencil className="h-4 w-4" /> {t('common.edit')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" /> {t('common.delete')}
              </Button>
            </div>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('customers.totalIncome')}</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            {formatCurrency(totalIncome)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('customers.totalHoursPaid')}</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            {formatHours(totalHoursPaid)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('customers.activeProjects')}</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">{activeCount}</CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('customers.contact')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted">{t('customers.name')}: </span>
            {customer.contactName || '—'}
          </p>
          <p>
            <span className="text-muted">{t('customers.email')}: </span>
            {customer.contactEmail || '—'}
          </p>
          <p>
            <span className="text-muted">{t('customers.status')}: </span>
            <Badge status={customer.status}>{t(`status.${customer.status}`)}</Badge>
          </p>
          {customer.notes && <p className="text-muted">{customer.notes}</p>}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('customers.license')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {customer.hasLicense ? (
            <>
              <p>
                <span className="text-muted">{t('customers.annualAmount')}: </span>
                {customer.licenseAnnualAmount != null ? formatCurrency(customer.licenseAnnualAmount) : '—'}
              </p>
              <p>
                <span className="text-muted">{t('customers.currentPeriod')}: </span>
                {customer.licensePeriodStart ? formatDate(customer.licensePeriodStart) : '—'}
                {' – '}
                {customer.licensePeriodEnd ? formatDate(customer.licensePeriodEnd) : '—'}
              </p>
              <p>
                <span className="text-muted">{t('customers.paymentStatus')}: </span>
                <Badge status={customer.licensePaid ? 'paid' : 'unpaid'}>
                  {customer.licensePaid ? t('status.paid') : t('status.unpaid')}
                </Badge>
              </p>
              <p>
                <span className="text-muted">{t('customers.platformVersion')}: </span>
                {customer.licensePlatformVersion ?? '—'}
              </p>
              <p>
                <span className="text-muted">{t('customers.modelsInstalled')}: </span>
                {customer.licenseModelsInstalled.length > 0 ? customer.licenseModelsInstalled.join(', ') : '—'}
              </p>
            </>
          ) : (
            <p className="text-muted">{t('customers.notLicensed')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('customers.projects')}</CardTitle>
        </CardHeader>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="px-5 py-3 text-start font-medium">{t('customers.colProject')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('customers.colStatus')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('customers.colIncome')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('customers.colHoursPaid')}</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-muted">
                  {t('customers.noProjectsYet')}
                </td>
              </tr>
            )}
            {projects.map((project) => (
              <tr
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-bg"
              >
                <td className="px-5 py-3 font-medium">{project.name}</td>
                <td className="px-5 py-3">
                  <Badge status={project.status}>{t(`status.${project.status}`)}</Badge>
                </td>
                <td className="px-5 py-3 tabular-nums">{formatCurrency(Number(project.incomeAmount), project.currency)}</td>
                <td className="px-5 py-3 tabular-nums">{formatHours(Number(project.hoursPaid))}</td>
                <td className="px-5 py-3 text-end">
                  <ArrowRight className="h-4 w-4 text-muted" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={customer}
        isSubmitting={updateCustomer.isPending}
        onSubmit={(input) => updateCustomer.mutate(input, { onSuccess: () => setFormOpen(false) })}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('customers.deleteTitle')}
        description={t('customers.deleteDescription', { name: customer.name })}
        error={deleteError}
        isSubmitting={deleteCustomer.isPending}
        onConfirm={() =>
          deleteCustomer.mutate(customer.id, {
            onSuccess: () => navigate('/customers'),
            onError: (err) =>
              setDeleteError(err instanceof ApiRequestError ? err.message : t('common.failedToDelete')),
          })
        }
      />
    </div>
  );
}
