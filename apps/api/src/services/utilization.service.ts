import { prisma } from '../lib/prisma.js';
import { monthKey, monthsBetween, parseMonthParam } from '../lib/month.js';

export interface UtilizationRow {
  employeeId: string;
  employeeName: string;
  month: string;
  plannedHours: number;
  actualHours: number | null;
  capacityHours: number;
  utilization: number;
}

export async function getUtilizationReport(params: {
  from: string;
  to: string;
  employeeId?: string;
  department?: string;
  employeeIds?: string[];
}) {
  const fromDate = parseMonthParam(params.from);
  const toDate = parseMonthParam(params.to);
  const months = monthsBetween(fromDate, toDate);

  const employees = await prisma.employee.findMany({
    where: {
      isActive: true,
      ...(params.employeeId ? { id: params.employeeId } : {}),
      ...(params.department ? { department: params.department } : {}),
      ...(params.employeeIds ? { id: { in: params.employeeIds } } : {}),
    },
    orderBy: { firstName: 'asc' },
  });

  const [allocations, overrides] = await Promise.all([
    prisma.monthlyAllocation.groupBy({
      by: ['employeeId', 'month'],
      where: {
        month: { gte: fromDate, lte: toDate },
        employeeId: { in: employees.map((e) => e.id) },
      },
      _sum: { plannedHours: true, actualHours: true },
    }),
    prisma.capacityOverride.findMany({
      where: { month: { gte: fromDate, lte: toDate }, employeeId: { in: employees.map((e) => e.id) } },
    }),
  ]);

  const allocationMap = new Map<string, { planned: number; actual: number | null }>();
  for (const a of allocations) {
    allocationMap.set(`${a.employeeId}|${monthKey(a.month)}`, {
      planned: Number(a._sum.plannedHours ?? 0),
      actual: a._sum.actualHours !== null ? Number(a._sum.actualHours) : null,
    });
  }

  const overrideMap = new Map<string, number>();
  for (const o of overrides) {
    overrideMap.set(`${o.employeeId}|${monthKey(o.month)}`, Number(o.capacityHours));
  }

  const rows: UtilizationRow[] = [];
  for (const employee of employees) {
    for (const month of months) {
      const key = `${employee.id}|${monthKey(month)}`;
      const allocation = allocationMap.get(key);
      const capacity = overrideMap.get(key) ?? Number(employee.monthlyCapacityHours);
      const plannedHours = allocation?.planned ?? 0;
      rows.push({
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        month: monthKey(month),
        plannedHours,
        actualHours: allocation?.actual ?? null,
        capacityHours: capacity,
        utilization: capacity > 0 ? plannedHours / capacity : 0,
      });
    }
  }

  const totalsByMonth = months.map((month) => {
    const key = monthKey(month);
    const monthRows = rows.filter((r) => r.month === key);
    const plannedHours = monthRows.reduce((sum, r) => sum + r.plannedHours, 0);
    const capacityHours = monthRows.reduce((sum, r) => sum + r.capacityHours, 0);
    return { month: key, plannedHours, capacityHours, utilization: capacityHours > 0 ? plannedHours / capacityHours : 0 };
  });

  return { rows, totalsByMonth };
}
