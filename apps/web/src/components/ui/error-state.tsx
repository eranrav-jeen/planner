import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center text-sm">
      <AlertTriangle className="h-5 w-5 text-coral" />
      <p className="text-muted">{message ?? 'Something went wrong loading this data.'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </div>
  );
}
