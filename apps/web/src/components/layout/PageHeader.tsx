import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../lib/i18n';

export function PageHeader({
  title,
  actions,
  showBack = true,
}: {
  title: string;
  actions?: ReactNode;
  showBack?: boolean;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t('common.back')}
            className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-charcoal"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-xl font-semibold text-charcoal">{title}</h1>
      </div>
      {actions}
    </div>
  );
}
