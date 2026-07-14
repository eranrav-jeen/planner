import { Download } from 'lucide-react';
import { Button } from '../../components/ui/button';

export type ExportableReport =
  | 'utilization'
  | 'demand-capacity'
  | 'project-burn'
  | 'profitability'
  | 'portfolio'
  | 'forecast'
  | 'gantt';

export function ExportButton({
  report,
  params = {},
}: {
  report: ExportableReport;
  params?: Record<string, string | undefined>;
}) {
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
      <Button variant="secondary" size="sm" onClick={() => download('xlsx')}>
        <Download className="h-3.5 w-3.5" /> Excel
      </Button>
      <Button variant="secondary" size="sm" onClick={() => download('pdf')}>
        <Download className="h-3.5 w-3.5" /> PDF
      </Button>
    </div>
  );
}
