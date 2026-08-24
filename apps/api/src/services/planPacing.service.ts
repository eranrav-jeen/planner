import { prisma } from '../lib/prisma.js';

export type PacingDimension = 'customer' | 'project' | 'employee';
export type PacingPeriod = 'month' | 'quarter';

export type PacingStatus =
  | 'no_plan' // actuals with no planned hours
  | 'not_started' // period hasn't begun
  | 'under' // period complete, below plan
  | 'met' // period complete, on plan
  | 'over' // period complete, above plan
  | 'behind' // in progress, projected below plan
  | 'on_track' // in progress, projected ~on plan
  | 'ahead'; // in progress, projected above plan

const MS_PER_DAY = 86_400_000;

function firstOfMonth(year: number, month0: number): Date {
  return new Date(Date.UTC(year, month0, 1));
}

function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

// Count Mon–Fri days in [startIncl, endExcl). Periods are <= 3 months, so a
// simple day walk is fine.
function countBusinessDays(startIncl: Date, endExcl: Date): number {
  if (endExcl <= startIncl) return 0;
  let count = 0;
  for (let t = startIncl.getTime(); t < endExcl.getTime(); t += MS_PER_DAY) {
    const dow = new Date(t).getUTCDay(); // 0 Sun .. 6 Sat
    if (dow !== 0 && dow !== 6) count += 1;
  }
  return count;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface PacingRow {
  id: string;
  name: string;
  sublabel: string | null;
  planned: number;
  actual: number;
  /** run-rate projection to the end of the period (= actual when complete) */
  projected: number | null;
  /** actual / planned */
  pctActual: number | null;
  /** projected / planned */
  pctProjected: number | null;
  /** planned − actual, hours still needed (may be negative) */
  remainingPlanned: number;
  /** hours/week needed over the remaining business days to still hit plan */
  requiredPerWeek: number | null;
  /** hours/week logged so far */
  currentPerWeek: number | null;
  status: PacingStatus;
}

export interface PacingReport {
  dimension: PacingDimension;
  period: PacingPeriod;
  periodStart: string; // YYYY-MM-DD, first day
  periodEnd: string; // YYYY-MM-DD, last day (inclusive)
  totalBusinessDays: number;
  elapsedBusinessDays: number;
  remainingBusinessDays: number;
  rows: PacingRow[];
}

export async function getPacingReport(params: {
  dimension: PacingDimension;
  period: PacingPeriod;
  month: string; // YYYY-MM anchor
  projectIds?: string[]; // access scope; undefined = all
}): Promise<PacingReport> {
  const [yStr, mStr] = params.month.split('-');
  const year = Number(yStr);
  const month0 = Number(mStr) - 1;

  const startMonth0 = params.period === 'quarter' ? Math.floor(month0 / 3) * 3 : month0;
  const monthsCount = params.period === 'quarter' ? 3 : 1;
  const periodStart = firstOfMonth(year, startMonth0);
  const periodEndExcl = firstOfMonth(year, startMonth0 + monthsCount);
  const periodEndInclusive = new Date(periodEndExcl.getTime() - MS_PER_DAY);

  const today = todayUTC();
  const clampedNowExcl =
    today.getTime() + MS_PER_DAY < periodStart.getTime()
      ? periodStart
      : new Date(Math.min(today.getTime() + MS_PER_DAY, periodEndExcl.getTime()));

  const totalBusinessDays = countBusinessDays(periodStart, periodEndExcl);
  const elapsedBusinessDays = countBusinessDays(periodStart, clampedNowExcl);
  const remainingBusinessDays = Math.max(0, totalBusinessDays - elapsedBusinessDays);

  const allocations = await prisma.monthlyAllocation.findMany({
    where: {
      month: { gte: periodStart, lt: periodEndExcl },
      ...(params.projectIds !== undefined ? { projectId: { in: params.projectIds } } : {}),
    },
    select: { projectId: true, employeeId: true, plannedHours: true, actualHours: true },
  });

  // Lookups for names / grouping.
  const projects = await prisma.project.findMany({
    where: params.projectIds !== undefined ? { id: { in: params.projectIds } } : {},
    select: { id: true, name: true, code: true, customerId: true, customer: { select: { name: true } } },
  });
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const employeeIds = [...new Set(allocations.map((a) => a.employeeId))];
  const employees =
    params.dimension === 'employee'
      ? await prisma.employee.findMany({
          where: { id: { in: employeeIds } },
          select: { id: true, firstName: true, lastName: true, title: true },
        })
      : [];
  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  // Aggregate planned/actual per dimension key.
  interface Agg {
    id: string;
    name: string;
    sublabel: string | null;
    planned: number;
    actual: number;
  }
  const groups = new Map<string, Agg>();

  for (const a of allocations) {
    const project = projectMap.get(a.projectId);
    let key: string;
    let name: string;
    let sublabel: string | null = null;
    if (params.dimension === 'project') {
      if (!project) continue;
      key = project.id;
      name = project.name;
      sublabel = `${project.code} · ${project.customer.name}`;
    } else if (params.dimension === 'customer') {
      if (!project) continue;
      key = project.customerId;
      name = project.customer.name;
    } else {
      const emp = employeeMap.get(a.employeeId);
      key = a.employeeId;
      name = emp ? `${emp.firstName} ${emp.lastName}`.trim() : a.employeeId;
      sublabel = emp?.title ?? null;
    }
    const g = groups.get(key) ?? { id: key, name, sublabel, planned: 0, actual: 0 };
    g.planned += Number(a.plannedHours);
    g.actual += Number(a.actualHours ?? 0);
    groups.set(key, g);
  }

  const periodComplete = remainingBusinessDays <= 0 && elapsedBusinessDays > 0;
  const notStarted = elapsedBusinessDays <= 0;

  const rows: PacingRow[] = [];
  for (const g of groups.values()) {
    const planned = round2(g.planned);
    const actual = round2(g.actual);
    if (planned <= 0 && actual <= 0) continue;

    const projected =
      periodComplete || elapsedBusinessDays <= 0
        ? periodComplete
          ? actual
          : null
        : round2((actual * totalBusinessDays) / elapsedBusinessDays);

    const remainingPlanned = round2(planned - actual);
    const requiredPerWeek =
      remainingBusinessDays > 0 && remainingPlanned > 0
        ? round1((remainingPlanned / remainingBusinessDays) * 5)
        : remainingPlanned <= 0
          ? 0
          : null;
    const currentPerWeek = elapsedBusinessDays > 0 ? round1((actual / elapsedBusinessDays) * 5) : null;

    let status: PacingStatus;
    if (planned <= 0) {
      status = 'no_plan';
    } else if (notStarted) {
      status = 'not_started';
    } else if (periodComplete) {
      const r = actual / planned;
      status = r > 1.01 ? 'over' : r >= 0.99 ? 'met' : 'under';
    } else {
      const r = projected != null ? projected / planned : 0;
      status = r > 1.05 ? 'ahead' : r >= 0.95 ? 'on_track' : 'behind';
    }

    rows.push({
      id: g.id,
      name: g.name,
      sublabel: g.sublabel,
      planned,
      actual,
      projected,
      pctActual: planned > 0 ? actual / planned : null,
      pctProjected: planned > 0 && projected != null ? projected / planned : null,
      remainingPlanned,
      requiredPerWeek,
      currentPerWeek,
      status,
    });
  }

  rows.sort((a, b) => b.planned - a.planned);

  return {
    dimension: params.dimension,
    period: params.period,
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEndInclusive.toISOString().slice(0, 10),
    totalBusinessDays,
    elapsedBusinessDays,
    remainingBusinessDays,
    rows,
  };
}
