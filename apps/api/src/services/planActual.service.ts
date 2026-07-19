import { prisma } from '../lib/prisma.js';
import { parseMonthParam } from '../lib/month.js';

// Planned vs actual (imported) hours per project over a month range.
// actualHours is populated by the customer-hours import; where a project has no
// imported actuals yet, actual is 0 so the variance shows the full plan as
// not-yet-delivered rather than silently hiding it.
export async function getPlanVsActualReport(params: {
  from: string;
  to: string;
  customerId?: string;
  projectIds?: string[];
}) {
  const from = parseMonthParam(params.from);
  const to = parseMonthParam(params.to);

  const projects = await prisma.project.findMany({
    where: {
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.projectIds ? { id: { in: params.projectIds } } : {}),
    },
    include: { customer: { select: { name: true } } },
  });
  const projectIds = projects.map((p) => p.id);

  const sums = await prisma.monthlyAllocation.groupBy({
    by: ['projectId'],
    where: { projectId: { in: projectIds }, month: { gte: from, lte: to } },
    _sum: { plannedHours: true, actualHours: true },
  });
  const sumMap = new Map(sums.map((s) => [s.projectId, s]));

  const rows = projects
    .map((project) => {
      const sum = sumMap.get(project.id);
      const planned = Number(sum?._sum.plannedHours ?? 0);
      const actual = Number(sum?._sum.actualHours ?? 0);
      const variance = actual - planned;
      return {
        projectId: project.id,
        projectName: project.name,
        projectCode: project.code,
        customerName: project.customer.name,
        planned,
        actual,
        variance,
        variancePercent: planned > 0 ? variance / planned : actual > 0 ? 1 : 0,
      };
    })
    // Only projects with something to compare in this window.
    .filter((r) => r.planned > 0 || r.actual > 0);

  return { rows };
}
