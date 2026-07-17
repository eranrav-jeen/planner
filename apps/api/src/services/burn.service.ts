import { prisma } from '../lib/prisma.js';

export async function getProjectBurnReport(params: { customerId?: string; status?: string; projectIds?: string[] }) {
  const projects = await prisma.project.findMany({
    where: {
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.projectIds ? { id: { in: params.projectIds } } : {}),
    },
    include: { customer: true },
    orderBy: { startDate: 'desc' },
  });

  const sums = await prisma.monthlyAllocation.groupBy({
    by: ['projectId'],
    where: { projectId: { in: projects.map((p) => p.id) } },
    _sum: { plannedHours: true, actualHours: true },
  });
  const sumMap = new Map(sums.map((s) => [s.projectId, s]));

  const rows = projects.map((project) => {
    const sum = sumMap.get(project.id);
    const consumed = Number(sum?._sum.actualHours ?? sum?._sum.plannedHours ?? 0);
    const hoursPaid = Number(project.hoursPaid);
    const remaining = hoursPaid - consumed;
    return {
      projectId: project.id,
      projectName: project.name,
      projectCode: project.code,
      customerName: project.customer.name,
      status: project.status,
      endDate: project.endDate,
      hoursPaid,
      consumed,
      remaining,
      percentConsumed: hoursPaid > 0 ? consumed / hoursPaid : 0,
    };
  });

  return { rows };
}
