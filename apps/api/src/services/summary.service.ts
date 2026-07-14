import { prisma } from '../lib/prisma.js';

export async function getDashboardSummary() {
  const projects = await prisma.project.findMany();
  const sums = await prisma.monthlyAllocation.groupBy({
    by: ['projectId'],
    _sum: { plannedHours: true, actualHours: true },
  });
  const sumMap = new Map(sums.map((s) => [s.projectId, s]));

  const now = new Date();
  const activeProjects = projects.filter((p) => p.status === 'active');
  const totalIncome = projects.reduce((sum, p) => sum + Number(p.incomeAmount), 0);
  const totalHoursPaid = projects.reduce((sum, p) => sum + Number(p.hoursPaid), 0);

  let totalConsumed = 0;
  const atRisk: { projectId: string; projectName: string; projectCode: string; reason: string }[] = [];

  for (const project of projects) {
    const sum = sumMap.get(project.id);
    const consumed = Number(sum?._sum.actualHours ?? sum?._sum.plannedHours ?? 0);
    totalConsumed += consumed;

    if (project.status === 'completed' || project.status === 'cancelled') continue;

    const hoursPaid = Number(project.hoursPaid);
    const remaining = hoursPaid - consumed;
    const remainingRatio = hoursPaid > 0 ? remaining / hoursPaid : 0;
    const overdue = project.endDate ? project.endDate < now : false;

    if (remainingRatio < 0.1) {
      atRisk.push({ projectId: project.id, projectName: project.name, projectCode: project.code, reason: 'Remaining hours below 10%' });
    } else if (overdue) {
      atRisk.push({ projectId: project.id, projectName: project.name, projectCode: project.code, reason: 'Past end date, not completed' });
    }
  }

  return {
    activeProjectCount: activeProjects.length,
    totalIncome,
    totalHoursPaid,
    totalHoursConsumed: totalConsumed,
    atRiskProjects: atRisk,
  };
}
