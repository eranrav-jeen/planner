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
