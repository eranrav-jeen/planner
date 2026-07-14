const MONTH_PARAM_RE = /^(\d{4})-(\d{2})(?:-\d{2})?$/;

export function parseMonthParam(value: string): Date {
  const match = MONTH_PARAM_RE.exec(value);
  if (!match) {
    throw new Error(`Invalid month value: ${value}`);
  }
  const [, year, month] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

export function firstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addMonths(date: Date, count: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthsBetween(from: Date, to: Date): Date[] {
  const months: Date[] = [];
  let cursor = firstOfMonth(from);
  const end = firstOfMonth(to);
  while (cursor.getTime() <= end.getTime()) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}
