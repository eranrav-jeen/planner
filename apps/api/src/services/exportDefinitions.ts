import type { ExportColumn, ExportMeta } from '../lib/excel.js';
import { getUtilizationReport } from './utilization.service.js';
import { getDemandCapacityReport } from './demandCapacity.service.js';
import { getProjectBurnReport } from './burn.service.js';
import { getProfitabilityReport } from './profitability.service.js';
import { getPortfolioReport } from './portfolio.service.js';
import { getForecastReport } from './forecast.service.js';
import { getGanttProjects } from './gantt.service.js';
import { ApiError } from '../middleware/error.js';
import type { Role } from '@prisma/client';

export interface ExportDefinition {
  meta: ExportMeta;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  totals?: Record<string, unknown>;
}

export const EXPORTABLE_REPORTS = [
  'utilization',
  'demand-capacity',
  'project-burn',
  'profitability',
  'portfolio',
  'forecast',
  'gantt',
] as const;
export type ExportableReport = (typeof EXPORTABLE_REPORTS)[number];

export async function buildExportDefinition(
  report: string,
  query: Record<string, string | undefined>,
  role: Role,
): Promise<ExportDefinition> {
  const generatedAt = new Date();

  switch (report) {
    case 'utilization': {
      const from = requireParam(query, 'from');
      const to = requireParam(query, 'to');
      const { rows, totalsByMonth } = await getUtilizationReport({
        from,
        to,
        employeeId: query.employeeId,
        department: query.department,
      });
      const exportRows: Record<string, unknown>[] = rows.map((r) => ({ ...r }));
      for (const t of totalsByMonth) {
        exportRows.push({
          employeeName: 'Team total',
          month: t.month,
          plannedHours: t.plannedHours,
          capacityHours: t.capacityHours,
          utilization: t.utilization,
        });
      }
      return {
        meta: { title: 'Employee Utilization', generatedAt, filters: { from, to, employeeId: query.employeeId } },
        columns: [
          { header: 'Employee', key: 'employeeName', width: 24 },
          { header: 'Month', key: 'month', width: 12 },
          { header: 'Planned', key: 'plannedHours', width: 12, format: 'hours' },
          { header: 'Capacity', key: 'capacityHours', width: 12, format: 'hours' },
          { header: 'Utilization', key: 'utilization', width: 12, format: 'percent' },
        ],
        rows: exportRows,
      };
    }

    case 'demand-capacity': {
      const from = requireParam(query, 'from');
      const to = requireParam(query, 'to');
      const { rows } = await getDemandCapacityReport({ from, to });
      const totals = rows.reduce(
        (acc, r) => ({ demand: acc.demand + r.demand, capacity: acc.capacity + r.capacity, gap: acc.gap + r.gap }),
        { demand: 0, capacity: 0, gap: 0 },
      );
      return {
        meta: { title: 'Resource Demand vs Capacity', generatedAt, filters: { from, to } },
        columns: [
          { header: 'Month', key: 'month', width: 12 },
          { header: 'Demand', key: 'demand', width: 14, format: 'hours' },
          { header: 'Capacity', key: 'capacity', width: 14, format: 'hours' },
          { header: 'Gap', key: 'gap', width: 14, format: 'hours' },
        ],
        rows,
        totals: { month: 'Total', ...totals },
      };
    }

    case 'project-burn': {
      const { rows } = await getProjectBurnReport({ customerId: query.customerId, status: query.status });
      const totals = rows.reduce(
        (acc, r) => ({
          hoursPaid: acc.hoursPaid + r.hoursPaid,
          consumed: acc.consumed + r.consumed,
          remaining: acc.remaining + r.remaining,
        }),
        { hoursPaid: 0, consumed: 0, remaining: 0 },
      );
      return {
        meta: {
          title: 'Project Burn',
          generatedAt,
          filters: { customerId: query.customerId, status: query.status },
        },
        columns: [
          { header: 'Project', key: 'projectName', width: 26 },
          { header: 'Code', key: 'projectCode', width: 14 },
          { header: 'Customer', key: 'customerName', width: 22 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Paid', key: 'hoursPaid', width: 12, format: 'hours' },
          { header: 'Consumed', key: 'consumed', width: 12, format: 'hours' },
          { header: 'Remaining', key: 'remaining', width: 12, format: 'hours' },
          { header: '% used', key: 'percentConsumed', width: 10, format: 'percent' },
          { header: 'End date', key: 'endDate', width: 12, format: 'date' },
        ],
        rows,
        totals: { projectName: 'Total', ...totals },
      };
    }

    case 'profitability': {
      if (role !== 'ADMIN' && role !== 'MANAGER') {
        throw new ApiError(403, 'Insufficient permissions');
      }
      const { rows } = await getProfitabilityReport({ customerId: query.customerId, status: query.status });
      const totalsRaw = rows.reduce(
        (acc, r) => ({ income: acc.income + r.income, cost: acc.cost + r.cost, margin: acc.margin + r.margin }),
        { income: 0, cost: 0, margin: 0 },
      );
      return {
        meta: {
          title: 'Project Profitability',
          generatedAt,
          filters: { customerId: query.customerId, status: query.status },
        },
        columns: [
          { header: 'Project', key: 'projectName', width: 26 },
          { header: 'Code', key: 'projectCode', width: 14 },
          { header: 'Customer', key: 'customerName', width: 22 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Income', key: 'income', width: 14, format: 'currency' },
          { header: 'Cost', key: 'cost', width: 14, format: 'currency' },
          { header: 'Margin', key: 'margin', width: 14, format: 'currency' },
          { header: 'Margin %', key: 'marginPercent', width: 10, format: 'percent' },
        ],
        rows,
        totals: {
          projectName: 'Total',
          ...totalsRaw,
          marginPercent: totalsRaw.income > 0 ? totalsRaw.margin / totalsRaw.income : 0,
        },
      };
    }

    case 'portfolio': {
      const { rows } = await getPortfolioReport();
      const totals = rows.reduce(
        (acc, r) => ({
          projectCount: acc.projectCount + r.projectCount,
          activeProjectCount: acc.activeProjectCount + r.activeProjectCount,
          totalIncome: acc.totalIncome + r.totalIncome,
          totalHoursPaid: acc.totalHoursPaid + r.totalHoursPaid,
        }),
        { projectCount: 0, activeProjectCount: 0, totalIncome: 0, totalHoursPaid: 0 },
      );
      return {
        meta: { title: 'Customer Portfolio', generatedAt },
        columns: [
          { header: 'Customer', key: 'customerName', width: 26 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Projects', key: 'projectCount', width: 10, format: 'number' },
          { header: 'Active', key: 'activeProjectCount', width: 10, format: 'number' },
          { header: 'Total income', key: 'totalIncome', width: 16, format: 'currency' },
          { header: 'Hours paid', key: 'totalHoursPaid', width: 14, format: 'hours' },
        ],
        rows,
        totals: { customerName: 'Total', ...totals },
      };
    }

    case 'forecast': {
      const from = requireParam(query, 'from');
      const to = requireParam(query, 'to');
      const { byProject } = await getForecastReport({ from, to });
      const total = byProject.reduce((sum, p) => sum + p.total, 0);
      return {
        meta: { title: 'Revenue Forecast', generatedAt, filters: { from, to } },
        columns: [
          { header: 'Project', key: 'projectName', width: 26 },
          { header: 'Code', key: 'projectCode', width: 14 },
          { header: 'Billing type', key: 'billingType', width: 18 },
          { header: 'Method', key: 'method', width: 20 },
          { header: 'Forecasted revenue', key: 'total', width: 18, format: 'currency' },
        ],
        rows: byProject as unknown as Record<string, unknown>[],
        totals: { projectName: 'Total', total },
      };
    }

    case 'gantt': {
      const { rows } = await getGanttProjects({
        customerId: query.customerId,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      });
      return {
        meta: { title: 'Project Gantt', generatedAt, filters: { customerId: query.customerId } },
        columns: [
          { header: 'Project', key: 'name', width: 26 },
          { header: 'Code', key: 'code', width: 14 },
          { header: 'Customer', key: 'customerName', width: 22 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Start', key: 'startDate', width: 12, format: 'date' },
          { header: 'End', key: 'endDate', width: 12, format: 'date' },
          { header: '% complete', key: 'percentComplete', width: 12, format: 'percent' },
        ],
        rows: rows as unknown as Record<string, unknown>[],
      };
    }

    default:
      throw new ApiError(404, `Unknown report: ${report}`);
  }
}

function requireParam(query: Record<string, string | undefined>, key: string): string {
  const value = query[key];
  if (!value) throw new ApiError(422, `Missing required query param: ${key}`);
  return value;
}
