import { Minus, Plus } from 'lucide-react';
import { Select } from '../../components/ui/input';
import { addMonthsToKey, monthShortLabel } from '../../lib/months';
import type { Language } from '../../lib/i18n';

export function MonthRangeControl({
  windowStart,
  windowSize,
  onChangeStart,
  onChangeSize,
  language,
}: {
  windowStart: string;
  windowSize: number;
  onChangeStart: (next: string) => void;
  onChangeSize: (next: number) => void;
  language: Language;
}) {
  const to = addMonthsToKey(windowStart, windowSize - 1);
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Range:</span>
      <button
        type="button"
        onClick={() => onChangeStart(addMonthsToKey(windowStart, -1))}
        className="rounded-md border border-border p-1.5 hover:bg-bg"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-32 text-center text-sm font-medium tabular-nums">
        {monthShortLabel(windowStart, language)} – {monthShortLabel(to, language)}
      </span>
      <button
        type="button"
        onClick={() => onChangeStart(addMonthsToKey(windowStart, 1))}
        className="rounded-md border border-border p-1.5 hover:bg-bg"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <Select className="w-24" value={windowSize} onChange={(e) => onChangeSize(Number(e.target.value))}>
        {[3, 6, 7, 9, 12].map((n) => (
          <option key={n} value={n}>
            {n} months
          </option>
        ))}
      </Select>
    </div>
  );
}
