import { useLanguage } from '../lib/i18n';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export function Dashboard() {
  const { t } = useLanguage();

  return (
    <div>
      <PageHeader title={t('nav.dashboard')} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Active projects</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">—</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contracted income</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">—</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Paid hours vs consumed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">—</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Projects at risk</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">—</CardContent>
        </Card>
      </div>
      <p className="mt-6 text-sm text-muted">
        Utilization heatmap and revenue forecast charts land in Phase 3 (Reports & Dashboard).
      </p>
    </div>
  );
}
