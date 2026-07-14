import { prisma } from '../lib/prisma.js';
import { monthKey, monthsBetween, parseMonthParam } from '../lib/month.js';

export async function getDemandCapacityReport(params: { from: string; to: string }) {
  const fromDate = parseMonthParam(params.from);
  const toDate = parseMonthParam(params.to);
  const months = monthsBetween(fromDate, toDate);

  const employees = await prisma.employee.findMany({ where: { isActive: true } });

  const [allocations, overrides] = await Promise.all([
    prisma.monthlyAllocation.groupBy({
      by: ['month'],
      where: { month: { gte: fromDate, lte: toDate } },
      _sum: { plannedHours: true },
    }),
    prisma.capacityOverride.findMany({ where: { month: { gte: fromDate, lte: toDate } } }),
  ]);

  const demandByMonth = new Map<string, number>();
  for (const a of allocations) {
    demandByMonth.set(monthKey(a.month), Number(a._sum.plannedHours ?? 0));
  }

  const overrideMap = new Map<string, number>();
  for (const o of overrides) {
    overrideMap.set(`${o.employeeId}|${monthKey(o.month)}`, Number(o.capacityHours));
  }

  const rows = months.map((month) => {
    const key = monthKey(month);
    const capacity = employees.reduce(
      (sum, e) => sum + (overrideMap.get(`${e.id}|${key}`) ?? Number(e.monthlyCapacityHours)),
      0,
    );
    const demand = demandByMonth.get(key) ?? 0;
    return { month: key, demand, capacity, gap: capacity - demand };
  });

  return { rows };
}
