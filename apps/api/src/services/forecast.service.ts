import { prisma } from '../lib/prisma.js';
import { monthKey, monthsBetween, parseMonthParam } from '../lib/month.js';

export type ForecastMethod = 'time_and_materials' | 'fixed_price_weighted' | 'fixed_price_even' | 'none';

export interface ProjectForecast {
  projectId: string;
  projectName: string;
  projectCode: string;
  billingType: string;
  method: ForecastMethod;
  monthlyRevenue: Record<string, number>;
  total: number;
}

export async function getForecastReport(params: { from: string; to: string }) {
  const fromDate = parseMonthParam(params.from);
  const toDate = parseMonthParam(params.to);
  const windowMonths = monthsBetween(fromDate, toDate).map(monthKey);

  const projects = await prisma.project.findMany();
  const allocations = await prisma.monthlyAllocation.findMany({
    where: { projectId: { in: projects.map((p) => p.id) } },
  });

  const allocationsByProject = new Map<string, typeof allocations>();
  for (const a of allocations) {
    const list = allocationsByProject.get(a.projectId) ?? [];
    list.push(a);
    allocationsByProject.set(a.projectId, list);
  }

  const projectForecasts: ProjectForecast[] = [];

  for (const project of projects) {
    const projectAllocations = allocationsByProject.get(project.id) ?? [];
    const incomeAmount = Number(project.incomeAmount);
    const hoursPaid = Number(project.hoursPaid);
    const revenueByMonth: Record<string, number> = {};
    let method: ForecastMethod = 'none';

    if (project.billingType === 'time_and_materials') {
      method = 'time_and_materials';
      const effectiveRate = hoursPaid > 0 ? incomeAmount / hoursPaid : 0;
      for (const allocation of projectAllocations) {
        const key = monthKey(allocation.month);
        revenueByMonth[key] = (revenueByMonth[key] ?? 0) + Number(allocation.plannedHours) * effectiveRate;
      }
    } else {
      const totalPlannedHours = projectAllocations.reduce((sum, a) => sum + Number(a.plannedHours), 0);
      if (totalPlannedHours > 0) {
        method = 'fixed_price_weighted';
        for (const allocation of projectAllocations) {
          const key = monthKey(allocation.month);
          const weight = Number(allocation.plannedHours) / totalPlannedHours;
          revenueByMonth[key] = (revenueByMonth[key] ?? 0) + weight * incomeAmount;
        }
      } else if (project.startDate && project.endDate) {
        method = 'fixed_price_even';
        const activeMonths = monthsBetween(project.startDate, project.endDate).map(monthKey);
        const perMonth = activeMonths.length > 0 ? incomeAmount / activeMonths.length : 0;
        for (const key of activeMonths) {
          revenueByMonth[key] = (revenueByMonth[key] ?? 0) + perMonth;
        }
      }
    }

    const windowedRevenue: Record<string, number> = {};
    for (const key of windowMonths) {
      windowedRevenue[key] = revenueByMonth[key] ?? 0;
    }
    const total = Object.values(windowedRevenue).reduce((sum, v) => sum + v, 0);

    projectForecasts.push({
      projectId: project.id,
      projectName: project.name,
      projectCode: project.code,
      billingType: project.billingType,
      method,
      monthlyRevenue: windowedRevenue,
      total,
    });
  }

  const totalsByMonth = windowMonths.map((key) => ({
    month: key,
    revenue: projectForecasts.reduce((sum, p) => sum + (p.monthlyRevenue[key] ?? 0), 0),
  }));

  return { months: windowMonths, totalsByMonth, byProject: projectForecasts };
}
