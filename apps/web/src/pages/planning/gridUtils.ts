export function cellKey(employeeId: string, projectId: string, monthKey: string): string {
  return `${employeeId}|${projectId}|${monthKey}`;
}

export function utilizationClass(ratio: number): string {
  if (ratio > 1) return 'bg-coral/15 text-coral';
  if (ratio >= 0.9) return 'bg-amber/20 text-charcoal';
  if (ratio > 0) return 'bg-success/10 text-success';
  return 'text-muted';
}

export type InputMode = 'hours' | 'percent';

export function hoursToPercent(hours: number, capacity: number): number {
  return capacity > 0 ? (hours / capacity) * 100 : 0;
}

export function percentToHours(percent: number, capacity: number): number {
  return Math.round(((percent / 100) * capacity) * 10) / 10;
}
