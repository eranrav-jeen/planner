import { prisma } from '../lib/prisma.js';
import { parseMonthParam } from '../lib/month.js';
import type { z } from 'zod';
import type { allocationItemSchema } from '../schemas/allocation.schema.js';

type AllocationItem = z.infer<typeof allocationItemSchema>;

export async function bulkUpsertAllocations(items: AllocationItem[]) {
  const results = await prisma.$transaction(
    items.map((item) => {
      const month = parseMonthParam(item.month);
      const key = { employeeId_projectId_month: { employeeId: item.employeeId, projectId: item.projectId, month } };
      const isEmpty = item.plannedHours <= 0 && (item.actualHours === undefined || item.actualHours === null);

      if (isEmpty) {
        return prisma.monthlyAllocation.deleteMany({
          where: { employeeId: item.employeeId, projectId: item.projectId, month },
        });
      }

      return prisma.monthlyAllocation.upsert({
        where: key,
        update: {
          plannedHours: item.plannedHours,
          actualHours: item.actualHours ?? null,
          note: item.note ?? null,
        },
        create: {
          employeeId: item.employeeId,
          projectId: item.projectId,
          month,
          plannedHours: item.plannedHours,
          actualHours: item.actualHours ?? null,
          note: item.note ?? null,
        },
      });
    }),
  );

  return results;
}

export async function copyForwardAllocations(
  fromMonth: string,
  toMonths: string[],
  filters: { employeeId?: string; projectId?: string; restrictToProjectIds?: string[] },
) {
  const sourceMonth = parseMonthParam(fromMonth);
  const source = await prisma.monthlyAllocation.findMany({
    where: {
      month: sourceMonth,
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.restrictToProjectIds ? { projectId: { in: filters.restrictToProjectIds } } : {}),
    },
  });

  const targets = toMonths.map(parseMonthParam);

  const results = await prisma.$transaction(
    targets.flatMap((month) =>
      source.map((allocation) =>
        prisma.monthlyAllocation.upsert({
          where: {
            employeeId_projectId_month: {
              employeeId: allocation.employeeId,
              projectId: allocation.projectId,
              month,
            },
          },
          update: { plannedHours: allocation.plannedHours },
          create: {
            employeeId: allocation.employeeId,
            projectId: allocation.projectId,
            month,
            plannedHours: allocation.plannedHours,
          },
        }),
      ),
    ),
  );

  return results;
}
