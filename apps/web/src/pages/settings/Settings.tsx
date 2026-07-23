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
  useSendInvite,
  type User,
} from '../../api/users';
import { useAuth, ApiRequestError } from '../../lib/auth';
import { useLanguage } from '../../lib/i18n';
import { UserForm } from './UserForm';

export function Settings() {
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div>
        <PageHeader title={t('nav.settings')} />
        <Card>
          <div className="px-5 py-10 text-center text-sm text-muted">{t('settings.adminsOnly')}</div>
        </Card>
      </div>
    );
  }

  return <AdminSettings currentUserId={currentUser.id} />;
}

function AdminSettings({ currentUserId }: { currentUserId: string }) {
  const { t } = useLanguage();
  const { data: users, isLoading, isError, refetch } = useUsers();
  const createUser = useCreateUser();
  const [editing, setEditing] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const updateUser = useUpdateUser(editing?.id ?? '');
  const deleteUser = useDeleteUser();
  const sendInvite = useSendInvite();
  const [inviteStatus, setInviteStatus] = useState<Record<string, 'sent' | 'error'>>({});
  const [inviteErrorMsg, setInviteErrorMsg] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  function handleSendInvite(user: User) {
    setInviteStatus((prev) => {
      const { [user.id]: _drop, ...rest } = prev;
      return rest;
    });
    sendInvite.mutate(user.id, {
      onSuccess: () => {
        setInviteStatus((prev) => ({ ...prev, [user.id]: 'sent' }));
        setTimeout(() => {
          setInviteStatus((prev) => {
            const { [user.id]: _drop, ...rest } = prev;
            return rest;
          });
        }, 3000);
      },
      onError: (err) => {
        setInviteStatus((prev) => ({ ...prev, [user.id]: 'error' }));
        setInviteErrorMsg((prev) => ({
          ...prev,
          [user.id]: err instanceof ApiRequestError ? err.message : t('settings.failedToSend'),
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
      setFormError(err instanceof ApiRequestError ? err.message : t('settings.failedToSave'));
    if (editing) {
      updateUser.mutate(input, { onSuccess: () => setFormOpen(false), onError });
    } else {
      createUser.mutate(input, {
        onSuccess: (created) => {
          setFormOpen(false);
          setNotice(
            created.invited
              ? t('settings.inviteSent', { email: created.email })
              : t('settings.userCreated', { email: created.email }),
          );
          setTimeout(() => setNotice(null), 6000);
        },
        onError,
      });
    }
  }

  return (
    <div>
      <PageHeader
        title={t('nav.settings')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t('settings.newUser')}
          </Button>
        }
      />
      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          <Check className="h-4 w-4 shrink-0" /> {notice}
        </div>
      )}
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="px-5 py-3 text-start font-medium">{t('settings.colEmail')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('settings.colRole')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('settings.colStatus')}</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            <TableStatusRow
              colSpan={4}
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && (users?.length ?? 0) === 0}
              emptyMessage={t('settings.none')}
              onRetry={refetch}
            />
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">
                  {u.email}
                  {u.id === currentUserId && <span className="ms-1.5 text-xs text-muted">{t('settings.you')}</span>}
                </td>
                <td className="px-5 py-3 text-muted">
                  {t(`role.${u.role.toLowerCase()}`)}
                  {u.isRestricted && (
                    <span className="ms-1.5 text-xs text-coral">
                      (
                      {u.projectAccessIds.length === 1
                        ? t('settings.restrictedToProject')
                        : t('settings.restrictedToProjects', { count: u.projectAccessIds.length })}
                      )
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <Badge status={u.isActive ? 'active' : 'inactive'}>
                    {u.isActive ? t('common.active') : t('common.inactive')}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-end">
                  <div className="flex items-center justify-end gap-2">
                    {inviteStatus[u.id] === 'sent' && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <Check className="h-3.5 w-3.5" /> {t('settings.sent')}
                      </span>
                    )}
                    {inviteStatus[u.id] === 'error' && (
                      <span className="text-xs text-coral" title={inviteErrorMsg[u.id]}>
                        {t('settings.failedToSend')}
                      </span>
                    )}
                    <button
                      type="button"
                      title={t('settings.sendInvite')}
                      onClick={() => handleSendInvite(u)}
                      disabled={sendInvite.isPending && sendInvite.variables === u.id}
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
        title={t('settings.deleteUserTitle')}
        description={t('settings.deleteUserDescription', { email: deleteTarget?.email ?? '' })}
        error={deleteError}
        isSubmitting={deleteUser.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          setDeleteError(null);
          deleteUser.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
            onError: (err) =>
              setDeleteError(err instanceof ApiRequestError ? err.message : t('common.failedToDelete')),
          });
        }}
      />
    </div>
  );
}
