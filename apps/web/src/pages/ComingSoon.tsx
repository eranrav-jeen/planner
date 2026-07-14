import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent } from '../components/ui/card';

export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted">
          {title} lands in {phase}.
        </CardContent>
      </Card>
    </div>
  );
}
