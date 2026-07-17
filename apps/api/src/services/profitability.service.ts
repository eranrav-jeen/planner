import { prisma } from '../lib/prisma.js';

export async function getProfitabilityReport(params: { customerId?: string; status?: string; projectIds?: string[] }) {
  const projects = await prisma.project.findMany({
    where: {
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.projectIds ? { id: { in: params.projectIds } } : {}),
    },
    include: { customer: true },
    orderBy: { startDate: 'desc' },
  });

  const allocations = await prisma.monthlyAllocation.findMany({
    where: { projectId: { in: projects.map((p) => p.id) } },
    include: { employee: { select: { costRateHourly: true } } },
  });

  const costByProject = new Map<string, number>();
  for (const allocation of allocations) {
    const rate = allocation.employee.costRateHourly ? Number(allocation.employee.costRateHourly) : 0;
    const hours = Number(allocation.actualHours ?? allocation.plannedHours);
    costByProject.set(allocation.projectId, (costByProject.get(allocation.projectId) ?? 0) + hours * rate);
  }

  const rows = projects.map((project) => {
    const income = Number(project.incomeAmount);
    const cost = costByProject.get(project.id) ?? 0;
    const margin = income - cost;
    return {
      projectId: project.id,
      projectName: project.name,
      projectCode: project.code,
      customerName: project.customer.name,
      status: project.status,
      income,
      cost,
      margin,
      marginPercent: income > 0 ? margin / income : 0,
    };
  });

  return { rows };
}
