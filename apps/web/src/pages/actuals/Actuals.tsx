import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Trash2, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { Select } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { TableStatusRow } from '../../components/ui/table-status-row';
import {
  useImportBatches,
  useUploadActuals,
  useImportBatch,
  useCommitImport,
  useDeleteImport,
  type ImportBatch,
  type ImportDetail,
} from '../../api/actuals';
import { useEmployees } from '../../api/employees';
import { useProjects } from '../../api/projects';
import { useCustomers } from '../../api/customers';
import { useAuth, ApiRequestError } from '../../lib/auth';
import { useLanguage } from '../../lib/i18n';
import { formatHours, useDateFormatter } from '../../lib/format';

function statusKind(status: ImportBatch['status']): string {
  if (status === 'committed') return 'active';
  if (status === 'superseded') return 'inactive';
  return 'planning';
}

export function Actuals() {
  const { user } = useAuth();
  const { t } = useLanguage();
  if (user?.role !== 'ADMIN') {
    return (
      <div>
        <PageHeader title={t('actuals.title')} showBack={false} />
        <Card>
          <div className="px-5 py-10 text-center text-sm text-muted">{t('actuals.adminsOnly')}</div>
        </Card>
      </div>
    );
  }
  return <ActualsAdmin />;
}

function ActualsAdmin() {
  const { t } = useLanguage();
  const formatDate = useDateFormatter();
  const { data: batches, isLoading, isError, refetch } = useImportBatches();
  const upload = useUploadActuals();
  const deleteImport = useDeleteImport();
  const fileRef = useRef<HTMLInputElement>(null);

  const [reviewId, setReviewId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ImportBatch | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    upload.mutate(file, {
      onSuccess: (detail) => setReviewId(detail.batch.id),
      onError: (err) => setUploadError(err instanceof ApiRequestError ? err.message : t('actuals.uploadFailed')),
    });
  }

  return (
    <div>
      <PageHeader
        title={t('actuals.title')}
        showBack={false}
        actions={
          <Button onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            <Upload className="h-4 w-4" /> {upload.isPending ? t('actuals.uploading') : t('actuals.uploadFile')}
          </Button>
        }
      />
      <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={handleFile} />

      <p className="mb-4 max-w-3xl text-sm text-muted">
        {t('actuals.intro')}{' '}
        <Link to="/reports" className="text-charcoal underline">
          {t('actuals.seeReport')}
        </Link>
      </p>

      {uploadError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-coral">
          <AlertCircle className="h-4 w-4 shrink-0" /> {uploadError}
        </div>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="px-5 py-3 text-start font-medium">{t('actuals.colFile')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('actuals.colCustomer')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('actuals.colPeriod')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('actuals.colHours')}</th>
              <th className="px-5 py-3 text-start font-medium">{t('actuals.colStatus')}</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            <TableStatusRow
              colSpan={6}
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && (batches?.length ?? 0) === 0}
              emptyMessage={t('actuals.none')}
              onRetry={refetch}
            />
            {batches?.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">
                  <span className="flex items-center gap-2 font-medium">
                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted" />
                    <span className="max-w-[220px] truncate">{b.originalFileName}</span>
                  </span>
                </td>
                <td className="px-5 py-3 text-muted">{b.customer?.name ?? b.sourceCustomerName ?? '—'}</td>
                <td className="px-5 py-3 tabular-nums text-muted">
                  {b.periodStart.slice(0, 7)}
                  {b.periodStart.slice(0, 7) !== b.periodEnd.slice(0, 7) && ` – ${b.periodEnd.slice(0, 7)}`}
                </td>
                <td className="px-5 py-3 tabular-nums">
                  {formatHours(b.totalHours)}{' '}
                  <span className="text-xs text-muted">({b.entryCount})</span>
                </td>
                <td className="px-5 py-3">
                  <Badge status={statusKind(b.status)}>{t(`actuals.status.${b.status}`)}</Badge>
                  {b.committedAt && (
                    <span className="ms-1.5 text-xs text-muted">{formatDate(b.committedAt)}</span>
                  )}
                </td>
                <td className="px-5 py-3 text-end">
                  <div className="flex items-center justify-end gap-2">
                    {b.status === 'pending_review' && (
                      <Button size="sm" variant="secondary" onClick={() => setReviewId(b.id)}>
                        {t('actuals.review')}
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(b)}
                      className="text-muted hover:text-coral"
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {reviewId && <ReconcileDialog batchId={reviewId} onClose={() => setReviewId(null)} />}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('actuals.deleteTitle')}
        description={t('actuals.deleteDescription', { file: deleteTarget?.originalFileName ?? '' })}
        isSubmitting={deleteImport.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteImport.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}

function ReconcileDialog({ batchId, onClose }: { batchId: string; onClose: () => void }) {
  const { t } = useLanguage();
  const { data, isLoading } = useImportBatch(batchId);
  const commit = useCommitImport(batchId);
  const { data: employees } = useEmployees({ pageSize: '200' });
  const { data: projects } = useProjects({ pageSize: '200' });
  const { data: customers } = useCustomers({ pageSize: '200' });

  const [empMap, setEmpMap] = useState<Record<string, string>>({});
  const [projMap, setProjMap] = useState<Record<string, string>>({});
  const [customerId, setCustomerId] = useState<string>('');
  const [saveAliases, setSaveAliases] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  // Seed local mapping state once from the server's auto-match result.
  const preview = data?.preview;
  useEffect(() => {
    if (preview && !seeded) {
      setEmpMap(Object.fromEntries(preview.employees.map((e) => [e.source, e.matchedId ?? ''])));
      setProjMap(Object.fromEntries(preview.projects.map((p) => [p.source, p.matchedId ?? ''])));
      setCustomerId(preview.customer?.matchedId ?? '');
      setSeeded(true);
    }
  }, [preview, seeded]);

  const committed = data?.batch.status !== 'pending_review';
  const allMatched =
    !!customerId &&
    Object.values(empMap).every(Boolean) &&
    Object.values(projMap).every(Boolean);

  function submit() {
    setError(null);
    commit.mutate(
      { customerId, employeeMappings: empMap, projectMappings: projMap, saveAliases },
      {
        onSuccess: onClose,
        onError: (err) => setError(err instanceof ApiRequestError ? err.message : t('actuals.commitFailed')),
      },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('actuals.reconcileTitle')}>
      {isLoading || !preview ? (
        <p className="py-6 text-center text-sm text-muted">{t('common.loading')}</p>
      ) : committed ? (
        <p className="py-6 text-center text-sm text-muted">{t('actuals.alreadyProcessed')}</p>
      ) : (
        <div className="space-y-5">
          <div className="rounded-lg bg-bg px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{t('actuals.totalHours')}</span>
              <span className="font-medium tabular-nums">{formatHours(data.batch.totalHours)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t('actuals.lineCount')}</span>
              <span className="tabular-nums">{data.batch.entryCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t('actuals.period')}</span>
              <span className="tabular-nums">{data.batch.periodStart.slice(0, 7)}</span>
            </div>
          </div>

          <MatchSection
            label={t('actuals.customer')}
            rows={preview.customer ? [preview.customer] : []}
            valueFor={() => customerId}
            onChange={(_source, v) => setCustomerId(v)}
            options={(customers?.items ?? []).map((c) => ({ id: c.id, label: c.name }))}
            placeholder={t('actuals.selectCustomer')}
          />
          <MatchSection
            label={t('actuals.projects')}
            rows={preview.projects}
            valueFor={(s) => projMap[s] ?? ''}
            onChange={(s, v) => setProjMap((m) => ({ ...m, [s]: v }))}
            options={(projects?.items ?? []).map((p) => ({ id: p.id, label: `${p.name} (${p.code})` }))}
            placeholder={t('actuals.selectProject')}
          />
          <MatchSection
            label={t('actuals.employees')}
            rows={preview.employees}
            valueFor={(s) => empMap[s] ?? ''}
            onChange={(s, v) => setEmpMap((m) => ({ ...m, [s]: v }))}
            options={(employees?.items ?? []).map((e) => ({ id: e.id, label: `${e.firstName} ${e.lastName}` }))}
            placeholder={t('actuals.selectEmployee')}
          />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={saveAliases} onChange={(e) => setSaveAliases(e.target.checked)} />
            {t('actuals.saveAliases')}
          </label>

          {error && <p className="text-sm text-coral">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted">
              {allMatched ? t('actuals.allMatched') : t('actuals.mapAllHint')}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="button" onClick={submit} disabled={!allMatched || commit.isPending}>
                {t('actuals.commit')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function MatchSection({
  label,
  rows,
  valueFor,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  rows: { source: string; matchedId: string | null }[];
  valueFor: (source: string) => string;
  onChange: (source: string, value: string) => void;
  options: { id: string; label: string }[];
  placeholder: string;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium uppercase text-muted">{label}</div>
      <div className="space-y-2">
        {rows.map((r) => {
          const value = valueFor(r.source);
          return (
            <div key={r.source} className="flex items-center gap-2">
              <span className="flex w-1/2 items-center gap-1.5 truncate text-sm">
                {value ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-coral" />
                )}
                {r.source}
              </span>
              <Select value={value} onChange={(e) => onChange(r.source, e.target.value)} className="w-1/2">
                <option value="">{placeholder}</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
