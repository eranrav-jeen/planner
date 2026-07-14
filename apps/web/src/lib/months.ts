export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function addMonthsToKey(monthKey: string, count: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + count, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthRange(startKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonthsToKey(startKey, i));
}

export function monthKeyFromIso(iso: string): string {
  return iso.slice(0, 7);
}

export function monthShortLabel(monthKey: string, language: 'he' | 'en'): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const locale = language === 'he' ? 'he-IL' : 'en-US';
  return new Intl.DateTimeFormat(locale, { year: '2-digit', month: 'short', timeZone: 'UTC' }).format(date);
}
