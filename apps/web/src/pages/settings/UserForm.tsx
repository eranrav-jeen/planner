import { useState, type FormEvent } from 'react';
import type { User, UserInput } from '../../api/users';
import type { Role } from '../../lib/auth';
import { useProjects } from '../../api/projects';
import { Dialog } from '../../components/ui/dialog';
import { Field, Input, Select } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useLanguage } from '../../lib/i18n';

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
  const { t } = useLanguage();
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
    <Dialog open={open} onOpenChange={onOpenChange} title={user ? t('settings.form.editTitle') : t('settings.form.newTitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('settings.form.email')}>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={user ? t('settings.form.newPassword') : t('settings.form.passwordInvite')}>
          <Input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {!user && <p className="mt-1 text-xs text-muted">{t('settings.form.passwordInviteHint')}</p>}
        </Field>
        <Field label={t('settings.form.role')}>
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="ADMIN">{t('role.admin')}</option>
            <option value="MANAGER">{t('role.manager')}</option>
            <option value="VIEWER">{t('role.viewer')}</option>
          </Select>
        </Field>
        {user && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            {t('settings.form.active')}
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
              {t('settings.form.restrictToProjects')}
            </label>
            {isRestricted && (
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {items.length === 0 && <p className="text-sm text-muted">{t('settings.form.noProjectsYet')}</p>}
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
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
