import { prisma } from '../lib/prisma.js';

export async function getPortfolioReport(params: { customerIds?: string[]; projectIds?: string[] } = {}) {
  const customers = await prisma.customer.findMany({
    where: params.customerIds ? { id: { in: params.customerIds } } : {},
    include: {
      projects: params.projectIds ? { where: { id: { in: params.projectIds } } } : true,
    },
    orderBy: { name: 'asc' },
  });

  const rows = customers.map((customer) => ({
    customerId: customer.id,
    customerName: customer.name,
    status: customer.status,
    projectCount: customer.projects.length,
    activeProjectCount: customer.projects.filter((p) => p.status === 'active').length,
    totalIncome: customer.projects.reduce((sum, p) => sum + Number(p.incomeAmount), 0),
    totalHoursPaid: customer.projects.reduce((sum, p) => sum + Number(p.hoursPaid), 0),
  }));

  return { rows };
}
