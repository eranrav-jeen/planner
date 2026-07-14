import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, ArrowRight } from 'lucide-react';
import { useCustomer, useUpdateCustomer } from '../../api/customers';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { CustomerForm } from './CustomerForm';
import { useAuth } from '../../lib/auth';
import { formatCurrency, formatHours } from '../../lib/format';

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const { data: customer, isLoading } = useCustomer(id);
  const updateCustomer = useUpdateCustomer(id!);
  const [formOpen, setFormOpen] = useState(false);

  if (isLoading || !customer) {
    return <div className="text-sm text-muted">Loading...</div>;
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
            <Button variant="secondary" onClick={() => setFormOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total income</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            {formatCurrency(totalIncome)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total hours paid</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            {formatHours(totalHoursPaid)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active projects</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">{activeCount}</CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted">Name: </span>
            {customer.contactName || '—'}
          </p>
          <p>
            <span className="text-muted">Email: </span>
            {customer.contactEmail || '—'}
          </p>
          <p>
            <span className="text-muted">Status: </span>
            <Badge status={customer.status}>{customer.status}</Badge>
          </p>
          {customer.notes && <p className="text-muted">{customer.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="px-5 py-3 text-start font-medium">Project</th>
              <th className="px-5 py-3 text-start font-medium">Status</th>
              <th className="px-5 py-3 text-start font-medium">Income</th>
              <th className="px-5 py-3 text-start font-medium">Hours paid</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-muted">
                  No projects yet.
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
                  <Badge status={project.status}>{project.status}</Badge>
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
    </div>
  );
}
