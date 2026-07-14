import { prisma } from '../lib/prisma.js';

export interface GanttProjectRow {
  id: string;
  name: string;
  code: string;
  status: string;
  customerId: string;
  customerName: string;
  startDate: Date | null;
  endDate: Date | null;
  hoursPaid: number;
  consumed: number;
  percentComplete: number;
  incomeAmount: number;
  currency: string;
}

export async function getGanttProjects(params: { customerId?: string; from?: Date; to?: Date }) {
  const projects = await prisma.project.findMany({
    where: {
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.from ? { OR: [{ endDate: null }, { endDate: { gte: params.from } }] } : {}),
      ...(params.to ? { startDate: { lte: params.to } } : {}),
    },
    include: { customer: true },
    orderBy: [{ customerId: 'asc' }, { startDate: 'asc' }],
  });

  const sums = await prisma.monthlyAllocation.groupBy({
    by: ['projectId'],
    where: { projectId: { in: projects.map((p) => p.id) } },
    _sum: { plannedHours: true, actualHours: true },
  });
  const sumMap = new Map(sums.map((s) => [s.projectId, s]));

  const rows: GanttProjectRow[] = projects.map((project) => {
    const sum = sumMap.get(project.id);
    const consumed = Number(sum?._sum.actualHours ?? sum?._sum.plannedHours ?? 0);
    const hoursPaid = Number(project.hoursPaid);
    return {
      id: project.id,
      name: project.name,
      code: project.code,
      status: project.status,
      customerId: project.customerId,
      customerName: project.customer.name,
      startDate: project.startDate,
      endDate: project.endDate,
      hoursPaid,
      consumed,
      percentComplete: hoursPaid > 0 ? Math.min(consumed / hoursPaid, 1) : 0,
      incomeAmount: Number(project.incomeAmount),
      currency: project.currency,
    };
  });

  return { rows };
}
