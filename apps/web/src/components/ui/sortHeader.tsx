import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export function SortHeader<T>({
  label,
  sortKey,
  activeKey,
  dir,
  onClick,
  align = 'start',
}: {
  label: string;
  sortKey: keyof T;
  activeKey: keyof T;
  dir: 'asc' | 'desc';
  onClick: (key: keyof T) => void;
  align?: 'start' | 'end' | 'center';
}) {
  const isActive = sortKey === activeKey;
  return (
    <th
      className={cn(
        'px-3 py-3 text-xs font-medium uppercase text-muted',
        align === 'start' && 'text-start',
        align === 'end' && 'text-end',
        align === 'center' && 'text-center',
      )}
    >
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-charcoal',
          align === 'end' && 'flex-row-reverse',
          isActive && 'text-charcoal',
        )}
      >
        {label}
        {isActive ? dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );
}
