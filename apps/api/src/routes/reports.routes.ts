import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { monthRangeQuerySchema, projectFilterQuerySchema } from '../schemas/report.schema.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { serializeDecimals } from '../lib/serialize.js';
import { getUtilizationReport } from '../services/utilization.service.js';
import { getDemandCapacityReport } from '../services/demandCapacity.service.js';
import { getProjectBurnReport } from '../services/burn.service.js';
import { getProfitabilityReport } from '../services/profitability.service.js';
import { getPortfolioReport } from '../services/portfolio.service.js';
import { getForecastReport } from '../services/forecast.service.js';
import { getDashboardSummary } from '../services/summary.service.js';
import {
  getAccessScope,
  getAccessibleCustomerIds,
  getAccessibleEmployeeIds,
  intersectIds,
  intersectProjectIds,
} from '../lib/accessScope.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

reportsRouter.get(
  '/utilization',
  validateQuery(monthRangeQuerySchema),
  asyncHandler(async (req, res) => {
    const { from, to, employeeId, department } = req.query as unknown as {
      from: string;
      to: string;
      employeeId?: string;
      department?: string;
    };
    const accessibleEmployeeIds = await getAccessibleEmployeeIds(await getAccessScope(req));
    const employeeIds = intersectIds(accessibleEmployeeIds, employeeId);
    const report = await getUtilizationReport({ from, to, employeeId, department, employeeIds });
    res.json({ data: serializeDecimals(report) });
  }),
);

reportsRouter.get(
  '/demand-capacity',
  validateQuery(monthRangeQuerySchema),
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as unknown as { from: string; to: string };
    const employeeIds = await getAccessibleEmployeeIds(await getAccessScope(req));
    const report = await getDemandCapacityReport({ from, to, employeeIds: employeeIds ?? undefined });
    res.json({ data: serializeDecimals(report) });
  }),
);

reportsRouter.get(
  '/project-burn',
  validateQuery(projectFilterQuerySchema),
  asyncHandler(async (req, res) => {
    const { customerId, status } = req.query as unknown as { customerId?: string; status?: string };
    const scope = await getAccessScope(req);
    const projectIds = intersectProjectIds(scope, undefined);
    const report = await getProjectBurnReport({ customerId, status, projectIds });
    res.json({ data: serializeDecimals(report) });
  }),
);

reportsRouter.get(
  '/profitability',
  requireRole('ADMIN', 'MANAGER'),
  validateQuery(projectFilterQuerySchema),
  asyncHandler(async (req, res) => {
    const { customerId, status } = req.query as unknown as { customerId?: string; status?: string };
    const scope = await getAccessScope(req);
    const projectIds = intersectProjectIds(scope, undefined);
    const report = await getProfitabilityReport({ customerId, status, projectIds });
    res.json({ data: serializeDecimals(report) });
  }),
);

reportsRouter.get(
  '/portfolio',
  asyncHandler(async (req, res) => {
    const scope = await getAccessScope(req);
    const customerIds = await getAccessibleCustomerIds(scope);
    const report = await getPortfolioReport({
      customerIds: customerIds ?? undefined,
      projectIds: scope?.projectIds,
    });
    res.json({ data: serializeDecimals(report) });
  }),
);

reportsRouter.get(
  '/forecast',
  validateQuery(monthRangeQuerySchema),
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as unknown as { from: string; to: string };
    const scope = await getAccessScope(req);
    const report = await getForecastReport({ from, to, projectIds: scope?.projectIds });
    res.json({ data: serializeDecimals(report) });
  }),
);

reportsRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const scope = await getAccessScope(req);
    const customerIds = await getAccessibleCustomerIds(scope);
    const summary = await getDashboardSummary({
      projectIds: scope?.projectIds,
      customerIds: customerIds ?? undefined,
    });
    res.json({ data: serializeDecimals(summary) });
  }),
);
