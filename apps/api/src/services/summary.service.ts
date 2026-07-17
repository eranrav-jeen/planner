import { prisma } from '../lib/prisma.js';

const LICENSE_EXPIRY_WARNING_DAYS = 30;

export async function getDashboardSummary() {
  const projects = await prisma.project.findMany();
  const licensedCustomers = await prisma.customer.findMany({ where: { hasLicense: true } });
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

  const totalLicenseRevenue = licensedCustomers.reduce(
    (sum, c) => sum + Number(c.licenseAnnualAmount ?? 0),
    0,
  );

  const activeLicenseRevenue = licensedCustomers.reduce((sum, c) => {
    const isCurrentlyActive =
      c.licensePeriodStart != null &&
      c.licensePeriodEnd != null &&
      c.licensePeriodStart <= now &&
      c.licensePeriodEnd >= now;
    return isCurrentlyActive ? sum + Number(c.licenseAnnualAmount ?? 0) : sum;
  }, 0);

  const warningCutoff = new Date(now.getTime() + LICENSE_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000);
  const licenseAttention: { customerId: string; customerName: string; reason: string }[] = [];
  for (const c of licensedCustomers) {
    if (!c.licensePaid) {
      licenseAttention.push({ customerId: c.id, customerName: c.name, reason: 'Current license period not paid' });
    } else if (c.licensePeriodEnd && c.licensePeriodEnd < now) {
      licenseAttention.push({ customerId: c.id, customerName: c.name, reason: 'License period expired' });
    } else if (c.licensePeriodEnd && c.licensePeriodEnd <= warningCutoff) {
      const daysLeft = Math.ceil((c.licensePeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      licenseAttention.push({
        customerId: c.id,
        customerName: c.name,
        reason: `License expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      });
    }
  }

  return {
    activeProjectCount: activeProjects.length,
    totalIncome,
    activeLicenseRevenue,
    totalContractedIncome: totalIncome + activeLicenseRevenue,
    totalHoursPaid,
    totalHoursConsumed: totalConsumed,
    atRiskProjects: atRisk,
    licensedCustomerCount: licensedCustomers.length,
    totalLicenseRevenue,
    licenseAttention,
  };
}
