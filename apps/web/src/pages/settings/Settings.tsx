import { useState } from 'react';
import { Plus, Trash2, Pencil, Mail, Check } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { TableStatusRow } from '../../components/ui/table-status-row';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useSendWelcomeEmail,
  type User,
} from '../../api/users';
import { useAuth, ApiRequestError } from '../../lib/auth';
import { UserForm } from './UserForm';

export function Settings() {
  const { user: currentUser } = useAuth();

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div>
        <PageHeader title="Settings" />
        <Card>
          <div className="px-5 py-10 text-center text-sm text-muted">
            Settings and user management are available to Admins only.
          </div>
        </Card>
      </div>
    );
  }

  return <AdminSettings currentUserId={currentUser.id} />;
}

function AdminSettings({ currentUserId }: { currentUserId: string }) {
  const { data: users, isLoading, isError, refetch } = useUsers();
  const createUser = useCreateUser();
  const [editing, setEditing] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const updateUser = useUpdateUser(editing?.id ?? '');
  const deleteUser = useDeleteUser();
  const sendWelcomeEmail = useSendWelcomeEmail();
  const [welcomeStatus, setWelcomeStatus] = useState<Record<string, 'sent' | 'error'>>({});
  const [welcomeErrorMsg, setWelcomeErrorMsg] = useState<Record<string, string>>({});

  function handleSendWelcome(user: User) {
    setWelcomeStatus((prev) => {
      const { [user.id]: _drop, ...rest } = prev;
      return rest;
    });
    sendWelcomeEmail.mutate(user.id, {
      onSuccess: () => {
        setWelcomeStatus((prev) => ({ ...prev, [user.id]: 'sent' }));
        setTimeout(() => {
          setWelcomeStatus((prev) => {
            const { [user.id]: _drop, ...rest } = prev;
            return rest;
          });
        }, 3000);
      },
      onError: (err) => {
        setWelcomeStatus((prev) => ({ ...prev, [user.id]: 'error' }));
        setWelcomeErrorMsg((prev) => ({
          ...prev,
          [user.id]: err instanceof ApiRequestError ? err.message : 'Failed to send email',
        }));
      },
    });
  }

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setFormError(null);
    setFormOpen(true);
  }

  function handleSubmit(input: Parameters<typeof createUser.mutate>[0]) {
    const onError = (err: unknown) =>
      setFormError(err instanceof ApiRequestError ? err.message : 'Failed to save user');
    if (editing) {
      updateUser.mutate(input, { onSuccess: () => setFormOpen(false), onError });
    } else {
      createUser.mutate(input, { onSuccess: () => setFormOpen(false), onError });
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New user
          </Button>
        }
      />
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="px-5 py-3 text-start font-medium">Email</th>
              <th className="px-5 py-3 text-start font-medium">Role</th>
              <th className="px-5 py-3 text-start font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            <TableStatusRow
              colSpan={4}
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && (users?.length ?? 0) === 0}
              emptyMessage="No users yet."
              onRetry={refetch}
            />
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">
                  {u.email}
                  {u.id === currentUserId && <span className="ms-1.5 text-xs text-muted">(you)</span>}
                </td>
                <td className="px-5 py-3 capitalize text-muted">
                  {u.role.toLowerCase()}
                  {u.isRestricted && (
                    <span className="ms-1.5 text-xs normal-case text-coral">
                      (restricted to {u.projectAccessIds.length} project{u.projectAccessIds.length === 1 ? '' : 's'})
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <Badge status={u.isActive ? 'active' : 'inactive'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                </td>
                <td className="px-5 py-3 text-end">
                  <div className="flex items-center justify-end gap-2">
                    {welcomeStatus[u.id] === 'sent' && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <Check className="h-3.5 w-3.5" /> Sent
                      </span>
                    )}
                    {welcomeStatus[u.id] === 'error' && (
                      <span className="text-xs text-coral" title={welcomeErrorMsg[u.id]}>
                        Failed to send
                      </span>
                    )}
                    <button
                      type="button"
                      title="Send welcome email"
                      onClick={() => handleSendWelcome(u)}
                      disabled={sendWelcomeEmail.isPending && sendWelcomeEmail.variables === u.id}
                      className="text-muted hover:text-charcoal disabled:opacity-50"
                    >
                      <Mail className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => openEdit(u)} className="text-muted hover:text-charcoal">
                      <Pencil className="h-4 w-4" />
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(u);
                        }}
                        className="text-muted hover:text-coral"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <UserForm
        key={editing?.id ?? 'new'}
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing ?? undefined}
        isSubmitting={createUser.isPending || updateUser.isPending}
        error={formError}
        onSubmit={handleSubmit}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete user"
        description={`Permanently delete the login for "${deleteTarget?.email}"? This cannot be undone.`}
        error={deleteError}
        isSubmitting={deleteUser.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          setDeleteError(null);
          deleteUser.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
            onError: (err) =>
              setDeleteError(err instanceof ApiRequestError ? err.message : 'Failed to delete'),
          });
        }}
      />
    </div>
  );
}
