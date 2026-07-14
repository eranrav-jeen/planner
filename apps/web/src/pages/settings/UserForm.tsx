import { useState, type FormEvent } from 'react';
import type { User, UserInput } from '../../api/users';
import type { Role } from '../../lib/auth';
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const input: UserInput = { email, role, isActive };
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
