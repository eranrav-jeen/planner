import { useState, type FormEvent } from 'react';
import type { User, UserInput } from '../../api/users';
import type { Role } from '../../lib/auth';
import { useProjects } from '../../api/projects';
import { Dialog } from '../../components/ui/dialog';
import { Field, Input, Select } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

export function UserForm({
  open,
  onOpenChange,
  user,
  onSubmit,
  isSubmitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
  onSubmit: (input: UserInput) => void;
  isSubmitting: boolean;
  error?: string | null;
}) {
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(user?.role ?? 'VIEWER');
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [isRestricted, setIsRestricted] = useState(user?.isRestricted ?? false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(
    () => new Set(user?.projectAccessIds ?? []),
  );

  const { data: projects } = useProjects({ pageSize: '200' });
  const items = projects?.items ?? [];

  const projectsByCustomer = new Map<string, { customerName: string; projects: typeof items }>();
  for (const p of items) {
    const key = p.customerId;
    const group = projectsByCustomer.get(key) ?? { customerName: p.customer?.name ?? 'Unknown', projects: [] };
    group.projects.push(p);
    projectsByCustomer.set(key, group);
  }

  function toggleProject(id: string) {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const input: UserInput = {
      email,
      role,
      isActive,
      isRestricted,
      projectAccessIds: Array.from(selectedProjectIds),
    };
    if (password) input.password = password;
    onSubmit(input);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={user ? 'Edit user' : 'New user'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={user ? 'New password (leave blank to keep current)' : 'Password'}>
          <Input
            type="password"
            required={!user}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="VIEWER">Viewer</option>
          </Select>
        </Field>
        {user && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}
        {role !== 'ADMIN' && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={isRestricted}
                onChange={(e) => setIsRestricted(e.target.checked)}
              />
              Restrict to specific projects
            </label>
            {isRestricted && (
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {items.length === 0 && <p className="text-sm text-muted">No projects yet.</p>}
                {Array.from(projectsByCustomer.values()).map((group) => (
                  <div key={group.customerName}>
                    <div className="mb-1 text-xs font-medium uppercase text-muted">{group.customerName}</div>
                    <div className="space-y-1">
                      {group.projects.map((p) => (
                        <label key={p.id} className="flex items-center gap-1.5 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedProjectIds.has(p.id)}
                            onChange={() => toggleProject(p.id)}
                          />
                          {p.name} <span className="text-muted">({p.code})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {error && <p className="text-sm text-coral">{error}</p>}
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
