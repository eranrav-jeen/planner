import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { useLanguage } from '../../lib/i18n';

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center text-sm">
      <AlertTriangle className="h-5 w-5 text-coral" />
      <p className="text-muted">{message ?? t('common.somethingWrong')}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> {t('common.retry')}
        </Button>
      )}
    </div>
  );
}
