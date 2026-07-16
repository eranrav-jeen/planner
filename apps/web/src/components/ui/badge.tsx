import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const statusColors: Record<string, string> = {
  active: 'bg-success/10 text-success',
  prospect: 'bg-lavender/30 text-charcoal',
  inactive: 'bg-border text-muted',
  planning: 'bg-lavender/30 text-charcoal',
  on_hold: 'bg-amber/20 text-charcoal',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-border text-muted',
  paid: 'bg-success/10 text-success',
  unpaid: 'bg-coral/15 text-coral',
};

export function Badge({
  status,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { status?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        status ? statusColors[status] ?? 'bg-border text-muted' : 'bg-border text-muted',
        className,
      )}
      {...props}
    />
  );
}
