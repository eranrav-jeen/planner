import { Download } from 'lucide-react';
import { Button } from '../../components/ui/button';

export function ExportButton() {
  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" disabled title="Excel export lands in Phase 5">
        <Download className="h-3.5 w-3.5" /> Excel
      </Button>
      <Button variant="secondary" size="sm" disabled title="PDF export lands in Phase 5">
        <Download className="h-3.5 w-3.5" /> PDF
      </Button>
    </div>
  );
}
