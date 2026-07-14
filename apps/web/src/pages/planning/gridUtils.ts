export function cellKey(employeeId: string, projectId: string, monthKey: string): string {
  return `${employeeId}|${projectId}|${monthKey}`;
}

export function utilizationClass(ratio: number): string {
  if (ratio > 1) return 'bg-coral/15 text-coral';
  if (ratio >= 0.9) return 'bg-amber/20 text-charcoal';
  if (ratio > 0) return 'bg-success/10 text-success';
  return 'text-muted';
}
