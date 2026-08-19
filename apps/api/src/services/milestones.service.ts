import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

// ---- Date helpers (operate purely on UTC calendar dates; @db.Date columns
// come back as midnight-UTC Dates, so we keep everything in UTC to avoid drift).

const MS_PER_DAY = 86_400_000;

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUTC(d: Date, days: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days));
}

export interface MilestoneRange {
  start: Date; // inclusive
  end: Date; // exclusive
}

// Lay milestones end-to-end starting at the project start date, each spanning
// its duration in weeks. Returns a [start, end) range per milestone, in order.
export function computeTimeline(startDate: Date, durationsWeeks: number[]): MilestoneRange[] {
  const ranges: MilestoneRange[] = [];
  let cursor = utcDateOnly(startDate);
  for (const weeks of durationsWeeks) {
    const start = cursor;
    const end = addDaysUTC(start, weeks * 7);
    ranges.push({ start, end });
    cursor = end;
  }
  return ranges;
}

interface MonthOverlap {
  monthStart: Date; // first-of-month, UTC (matches MonthlyAllocation.month)
  overlapDays: number;
  daysInMonth: number;
}

// Break a [start, end) range into the calendar months it touches, with the
// number of days that fall in each month.
export function monthsInRange(start: Date, end: Date): MonthOverlap[] {
  const out: MonthOverlap[] = [];
  if (end <= start) return out;
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth();
  for (;;) {
    const monthStart = new Date(Date.UTC(y, m, 1));
    const nextMonth = new Date(Date.UTC(y, m + 1, 1));
    if (monthStart >= end) break;
    const from = start > monthStart ? start : monthStart;
    const to = end < nextMonth ? end : nextMonth;
    const overlapDays = Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
    if (overlapDays > 0) {
      const daysInMonth = Math.round((nextMonth.getTime() - monthStart.getTime()) / MS_PER_DAY);
      out.push({ monthStart, overlapDays, daysInMonth });
    }
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Hours a single milestone line (one professional's effort over one milestone)
// contributes in total: effort% of full-time capacity, prorated by how many
// days of each spanned month the milestone covers.
export function lineHours(range: MilestoneRange, monthlyCapacityHours: number, effortPct: number): number {
  const pct = effortPct / 100;
  let total = 0;
  for (const mo of monthsInRange(range.start, range.end)) {
    total += pct * monthlyCapacityHours * (mo.overlapDays / mo.daysInMonth);
  }
  return round2(total);
}

// ---- Roll-up: milestone effort -> MonthlyAllocation.plannedHours -----------

const allocKey = (employeeId: string, month: Date) => `${employeeId}|${month.toISOString().slice(0, 10)}`;

// Recompute a project's PLANNED monthly allocations from its milestones.
// - Only planned hours are touched; actualHours (from imports) is preserved.
// - Employees appearing on any milestone are auto-assigned to the project so
//   they show up in the planning grid.
// - Allocation rows no longer backed by a milestone are zeroed (kept if they
//   still hold actuals) or removed. A project with a start date but no
//   milestones therefore has its milestone-derived planned hours cleared.
// - If the project has no start date, milestones can't be placed on the
//   calendar, so we leave allocations untouched and let the UI prompt for one.
export async function recomputeProjectMilestoneAllocations(
  projectId: string,
  tx: Prisma.TransactionClient = prisma,
): Promise<void> {
  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: { id: true, startDate: true },
  });
  if (!project) return;

  const milestones = await tx.milestone.findMany({
    where: { projectId },
    orderBy: { sortOrder: 'asc' },
    include: { lines: { include: { employee: { select: { id: true, monthlyCapacityHours: true } } } } },
  });

  if (!project.startDate) return; // can't place milestones without a start date

  // Build the derived planned-hours map: employee|month -> hours.
  const derived = new Map<string, { employeeId: string; month: Date; hours: number }>();
  const ranges = computeTimeline(project.startDate, milestones.map((m) => m.durationWeeks));
  milestones.forEach((ms, i) => {
    const range = ranges[i];
    for (const line of ms.lines) {
      const cap = Number(line.employee.monthlyCapacityHours);
      const pct = Number(line.effortPct) / 100;
      for (const mo of monthsInRange(range.start, range.end)) {
        const hrs = pct * cap * (mo.overlapDays / mo.daysInMonth);
        const key = allocKey(line.employeeId, mo.monthStart);
        const prev = derived.get(key);
        if (prev) prev.hours += hrs;
        else derived.set(key, { employeeId: line.employeeId, month: mo.monthStart, hours: hrs });
      }
    }
  });
  for (const v of derived.values()) v.hours = round2(v.hours);

  // Ensure every professional on a milestone is assigned to the project.
  for (const employeeId of new Set([...derived.values()].map((v) => v.employeeId))) {
    await tx.projectAssignment.upsert({
      where: { projectId_employeeId: { projectId, employeeId } },
      update: {},
      create: { projectId, employeeId },
    });
  }

  // Reconcile existing allocation rows against the derived map.
  const existing = await tx.monthlyAllocation.findMany({
    where: { projectId },
    select: { id: true, employeeId: true, month: true, actualHours: true },
  });
  const seen = new Set<string>();
  for (const e of existing) {
    const key = allocKey(e.employeeId, e.month);
    seen.add(key);
    const d = derived.get(key);
    if (d) {
      await tx.monthlyAllocation.update({ where: { id: e.id }, data: { plannedHours: d.hours } });
    } else if (e.actualHours != null) {
      await tx.monthlyAllocation.update({ where: { id: e.id }, data: { plannedHours: 0 } });
    } else {
      await tx.monthlyAllocation.delete({ where: { id: e.id } });
    }
  }
  for (const [key, d] of derived) {
    if (!seen.has(key)) {
      await tx.monthlyAllocation.create({
        data: { projectId, employeeId: d.employeeId, month: d.month, plannedHours: d.hours },
      });
    }
  }
}

// ---- View model for the API (enriched milestones with timeline + hours) ----

export interface MilestoneLineView {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeTitle: string | null;
  workType: string;
  effortPct: number;
  hours: number;
}

export interface MilestoneView {
  id: string;
  name: string;
  durationWeeks: number;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
  totalHours: number;
  lines: MilestoneLineView[];
}

export interface MilestonesViewResult {
  projectStartDate: string | null;
  hasStartDate: boolean;
  milestones: MilestoneView[];
}

export async function getMilestonesView(projectId: string): Promise<MilestonesViewResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { startDate: true },
  });
  const milestones = await prisma.milestone.findMany({
    where: { projectId },
    orderBy: { sortOrder: 'asc' },
    include: {
      lines: {
        include: { employee: { select: { firstName: true, lastName: true, title: true, monthlyCapacityHours: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const startDate = project?.startDate ?? null;
  const ranges = startDate ? computeTimeline(startDate, milestones.map((m) => m.durationWeeks)) : null;

  const views: MilestoneView[] = milestones.map((ms, i) => {
    const range = ranges ? ranges[i] : null;
    const lines: MilestoneLineView[] = ms.lines.map((line) => ({
      id: line.id,
      employeeId: line.employeeId,
      employeeName: `${line.employee.firstName} ${line.employee.lastName}`.trim(),
      employeeTitle: line.employee.title,
      workType: line.workType,
      effortPct: Number(line.effortPct),
      hours: range ? lineHours(range, Number(line.employee.monthlyCapacityHours), Number(line.effortPct)) : 0,
    }));
    return {
      id: ms.id,
      name: ms.name,
      durationWeeks: ms.durationWeeks,
      sortOrder: ms.sortOrder,
      startDate: range ? range.start.toISOString().slice(0, 10) : null,
      endDate: range ? addDaysUTC(range.end, -1).toISOString().slice(0, 10) : null,
      totalHours: round2(lines.reduce((s, l) => s + l.hours, 0)),
      lines,
    };
  });

  return {
    projectStartDate: startDate ? startDate.toISOString().slice(0, 10) : null,
    hasStartDate: startDate != null,
    milestones: views,
  };
}
