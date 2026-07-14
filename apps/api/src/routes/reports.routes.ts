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
    const report = await getUtilizationReport({ from, to, employeeId, department });
    res.json({ data: serializeDecimals(report) });
  }),
);

reportsRouter.get(
  '/demand-capacity',
  validateQuery(monthRangeQuerySchema),
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as unknown as { from: string; to: string };
    const report = await getDemandCapacityReport({ from, to });
    res.json({ data: serializeDecimals(report) });
  }),
);

reportsRouter.get(
  '/project-burn',
  validateQuery(projectFilterQuerySchema),
  asyncHandler(async (req, res) => {
    const { customerId, status } = req.query as unknown as { customerId?: string; status?: string };
    const report = await getProjectBurnReport({ customerId, status });
    res.json({ data: serializeDecimals(report) });
  }),
);

reportsRouter.get(
  '/profitability',
  requireRole('ADMIN', 'MANAGER'),
  validateQuery(projectFilterQuerySchema),
  asyncHandler(async (req, res) => {
    const { customerId, status } = req.query as unknown as { customerId?: string; status?: string };
    const report = await getProfitabilityReport({ customerId, status });
    res.json({ data: serializeDecimals(report) });
  }),
);

reportsRouter.get(
  '/portfolio',
  asyncHandler(async (_req, res) => {
    const report = await getPortfolioReport();
    res.json({ data: serializeDecimals(report) });
  }),
);

reportsRouter.get(
  '/forecast',
  validateQuery(monthRangeQuerySchema),
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as unknown as { from: string; to: string };
    const report = await getForecastReport({ from, to });
    res.json({ data: serializeDecimals(report) });
  }),
);

reportsRouter.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const summary = await getDashboardSummary();
    res.json({ data: serializeDecimals(summary) });
  }),
);
