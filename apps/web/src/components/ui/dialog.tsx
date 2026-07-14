import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-charcoal/40" />
        <RadixDialog.Content className="fixed start-1/2 top-1/2 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-surface p-6 shadow-card rtl:translate-x-1/2">
          <div className="mb-4 flex items-center justify-between">
            <RadixDialog.Title className="text-base font-semibold text-charcoal">{title}</RadixDialog.Title>
            <RadixDialog.Close className="rounded-md p-1 text-muted hover:bg-bg">
              <X className="h-4 w-4" />
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
