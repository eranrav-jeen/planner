import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useCreateProject, useProjects } from '../../api/projects';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input, Select } from '../../components/ui/input';
import { ProjectForm } from './ProjectForm';
import { useAuth } from '../../lib/auth';
import { formatCurrency, formatHours } from '../../lib/format';

export function ProjectsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const { data, isLoading } = useProjects({ search, status: status || undefined });
  const createProject = useCreateProject();

  return (
    <div>
      <PageHeader
        title="Projects"
        actions={
          canEdit && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> New project
            </Button>
          )
        }
      />
      <div className="mb-4 flex gap-3">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search projects..."
            className="ps-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          <option value="">All statuses</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="on_hold">On hold</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="px-5 py-3 text-start font-medium">Project</th>
              <th className="px-5 py-3 text-start font-medium">Customer</th>
              <th className="px-5 py-3 text-start font-medium">Status</th>
              <th className="px-5 py-3 text-start font-medium">Income</th>
              <th className="px-5 py-3 text-start font-medium">Hours paid</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-muted">
                  Loading...
                </td>
              </tr>
            )}
            {data?.items.map((project) => (
              <tr
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-bg"
              >
                <td className="px-5 py-3 font-medium">
                  {project.name} <span className="text-muted">({project.code})</span>
                </td>
                <td className="px-5 py-3 text-muted">{project.customer?.name}</td>
                <td className="px-5 py-3">
                  <Badge status={project.status}>{project.status.replace('_', ' ')}</Badge>
                </td>
                <td className="px-5 py-3 tabular-nums">
                  {formatCurrency(Number(project.incomeAmount), project.currency)}
                </td>
                <td className="px-5 py-3 tabular-nums">{formatHours(Number(project.hoursPaid))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <ProjectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        isSubmitting={createProject.isPending}
        onSubmit={(input) => createProject.mutate(input, { onSuccess: () => setFormOpen(false) })}
      />
    </div>
  );
}
