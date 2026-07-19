import { Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useLanguage } from '../../lib/i18n';

export type ExportableReport =
  | 'utilization'
  | 'demand-capacity'
  | 'project-burn'
  | 'profitability'
  | 'portfolio'
  | 'forecast'
  | 'plan-vs-actual'
  | 'gantt'
  | 'planning';

export function ExportButton({
  report,
  params = {},
  formats = ['xlsx', 'pdf'],
}: {
  report: ExportableReport;
  params?: Record<string, string | undefined>;
  formats?: Array<'xlsx' | 'pdf'>;
}) {
  const { t } = useLanguage();
  function download(format: 'xlsx' | 'pdf') {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) qs.set(key, value);
    }
    const query = qs.toString();
    window.location.href = `/api/export/${report}.${format}${query ? `?${query}` : ''}`;
  }

  return (
    <div className="flex gap-2">
      {formats.includes('xlsx') && (
        <Button variant="secondary" size="sm" onClick={() => download('xlsx')}>
          <Download className="h-3.5 w-3.5" /> {t('reports.excel')}
        </Button>
      )}
      {formats.includes('pdf') && (
        <Button variant="secondary" size="sm" onClick={() => download('pdf')}>
          <Download className="h-3.5 w-3.5" /> {t('reports.pdf')}
        </Button>
      )}
    </div>
  );
}
