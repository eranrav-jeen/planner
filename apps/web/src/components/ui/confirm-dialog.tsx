import { Dialog } from './dialog';
import { Button } from './button';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  error,
  isSubmitting,
  onConfirm,
  confirmLabel = 'Delete',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  error?: string | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  confirmLabel?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title}>
      <p className="text-sm text-muted">{description}</p>
      {error && <p className="mt-3 text-sm text-coral">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" variant="accent" onClick={onConfirm} disabled={isSubmitting}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
