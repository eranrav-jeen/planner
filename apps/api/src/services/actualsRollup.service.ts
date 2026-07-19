import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface AllocKey {
  projectId: string;
  employeeId: string;
  month: Date;
}

function keyOf(k: AllocKey): string {
  return `${k.projectId}|${k.employeeId}|${k.month.toISOString().slice(0, 10)}`;
}

// Recompute MonthlyAllocation.actualHours for each (employee, project, month)
// from the sum of committed TimeEntryActual rows. Creates an allocation row if
// none exists yet (real work can happen on a project nobody planned), and clears
// actualHours back to null when no actuals remain (e.g. after a batch delete).
export async function recomputeActualHours(keys: AllocKey[], tx: Prisma.TransactionClient = prisma): Promise<void> {
  const unique = new Map<string, AllocKey>();
  for (const k of keys) unique.set(keyOf(k), k);

  for (const k of unique.values()) {
    const sum = await tx.timeEntryActual.aggregate({
      where: { projectId: k.projectId, employeeId: k.employeeId, month: k.month },
      _sum: { hours: true },
    });
    const total = sum._sum.hours;

    const existing = await tx.monthlyAllocation.findUnique({
      where: { employeeId_projectId_month: { employeeId: k.employeeId, projectId: k.projectId, month: k.month } },
      select: { id: true },
    });

    if (existing) {
      await tx.monthlyAllocation.update({
        where: { id: existing.id },
        data: { actualHours: total ?? null },
      });
    } else if (total != null) {
      await tx.monthlyAllocation.create({
        data: { employeeId: k.employeeId, projectId: k.projectId, month: k.month, plannedHours: 0, actualHours: total },
      });
    }
  }
}
