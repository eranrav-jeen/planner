import { useLanguage } from './i18n';

const CURRENCY_LOCALE: Record<string, string> = {
  ILS: 'he-IL',
  USD: 'en-US',
  EUR: 'de-DE',
};

export function formatCurrency(amount: number, currency = 'ILS'): string {
  const locale = CURRENCY_LOCALE[currency] ?? 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatHours(hours: number): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(hours)}h`;
}

export function formatPercent(ratio: number): string {
  return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 }).format(ratio);
}

export function useDateFormatter() {
  const { language } = useLanguage();
  const locale = language === 'he' ? 'he-IL' : 'en-US';
  return (date: string | Date) =>
    new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(
      new Date(date),
    );
}

export function monthLabel(monthIso: string, language: 'he' | 'en'): string {
  const locale = language === 'he' ? 'he-IL' : 'en-US';
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short' }).format(new Date(monthIso));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
