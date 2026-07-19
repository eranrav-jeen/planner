import { ErrorState } from './error-state';
import { useLanguage } from '../../lib/i18n';

export function TableStatusRow({
  colSpan,
  isLoading,
  isError,
  isEmpty,
  emptyMessage,
  errorMessage,
  onRetry,
}: {
  colSpan: number;
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  const { t } = useLanguage();
  if (isLoading) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-5 py-6 text-center text-muted">
          {t('common.loading')}
        </td>
      </tr>
    );
  }
  if (isError) {
    return (
      <tr>
        <td colSpan={colSpan} className="p-0">
          <ErrorState message={errorMessage} onRetry={onRetry} />
        </td>
      </tr>
    );
  }
  if (isEmpty) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-5 py-6 text-center text-muted">
          {emptyMessage ?? t('common.nothingToShow')}
        </td>
      </tr>
    );
  }
  return null;
}
