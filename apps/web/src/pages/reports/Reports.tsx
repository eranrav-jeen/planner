import * as Tabs from '@radix-ui/react-tabs';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuth } from '../../lib/auth';
import { useLanguage } from '../../lib/i18n';
import { UtilizationReport } from './UtilizationReport';
import { DemandCapacityReport } from './DemandCapacityReport';
import { ProjectBurnReport } from './ProjectBurnReport';
import { ProfitabilityReport } from './ProfitabilityReport';
import { PortfolioReport } from './PortfolioReport';
import { ForecastReport } from './ForecastReport';

const tabTrigger =
  'border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted data-[state=active]:border-charcoal data-[state=active]:text-charcoal';

export function Reports() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const canSeeProfitability = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <div>
      <PageHeader title={t('reports.title')} />
      <Tabs.Root defaultValue="utilization">
        <Tabs.List className="mb-4 flex overflow-x-auto border-b border-border">
          <Tabs.Trigger value="utilization" className={tabTrigger}>
            {t('reports.tabs.utilization')}
          </Tabs.Trigger>
          <Tabs.Trigger value="demand-capacity" className={tabTrigger}>
            {t('reports.tabs.demandCapacity')}
          </Tabs.Trigger>
          <Tabs.Trigger value="burn" className={tabTrigger}>
            {t('reports.tabs.burn')}
          </Tabs.Trigger>
          {canSeeProfitability && (
            <Tabs.Trigger value="profitability" className={tabTrigger}>
              {t('reports.tabs.profitability')}
            </Tabs.Trigger>
          )}
          <Tabs.Trigger value="portfolio" className={tabTrigger}>
            {t('reports.tabs.portfolio')}
          </Tabs.Trigger>
          <Tabs.Trigger value="forecast" className={tabTrigger}>
            {t('reports.tabs.forecast')}
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="utilization">
          <UtilizationReport />
        </Tabs.Content>
        <Tabs.Content value="demand-capacity">
          <DemandCapacityReport />
        </Tabs.Content>
        <Tabs.Content value="burn">
          <ProjectBurnReport />
        </Tabs.Content>
        {canSeeProfitability && (
          <Tabs.Content value="profitability">
            <ProfitabilityReport />
          </Tabs.Content>
        )}
        <Tabs.Content value="portfolio">
          <PortfolioReport />
        </Tabs.Content>
        <Tabs.Content value="forecast">
          <ForecastReport />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
