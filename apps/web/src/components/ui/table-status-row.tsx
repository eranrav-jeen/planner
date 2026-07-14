import { ErrorState } from './error-state';

export function TableStatusRow({
  colSpan,
  isLoading,
  isError,
  isEmpty,
  emptyMessage = 'Nothing to show yet.',
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
  if (isLoading) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-5 py-6 text-center text-muted">
          Loading...
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
          {emptyMessage}
        </td>
      </tr>
    );
  }
  return null;
}
