import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  allocationRangeQuerySchema,
  bulkUpsertAllocationsSchema,
  copyForwardSchema,
} from '../schemas/allocation.schema.js';
import { parseMonthParam } from '../lib/month.js';
import { serializeDecimals } from '../lib/serialize.js';
import { bulkUpsertAllocations, copyForwardAllocations } from '../services/allocations.service.js';

export const allocationsRouter = Router();
allocationsRouter.use(requireAuth);

allocationsRouter.get(
  '/',
  validateQuery(allocationRangeQuerySchema),
  asyncHandler(async (req, res) => {
    const { from, to, employeeId, projectId } = req.query as unknown as {
      from: string;
      to: string;
      employeeId?: string;
      projectId?: string;
    };

    const items = await prisma.monthlyAllocation.findMany({
      where: {
        month: { gte: parseMonthParam(from), lte: parseMonthParam(to) },
        ...(employeeId ? { employeeId } : {}),
        ...(projectId ? { projectId } : {}),
      },
      orderBy: [{ month: 'asc' }],
    });

    res.json({ data: serializeDecimals(items) });
  }),
);

allocationsRouter.put(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validateBody(bulkUpsertAllocationsSchema),
  asyncHandler(async (req, res) => {
    const results = await bulkUpsertAllocations(req.body.items);
    res.json({ data: serializeDecimals(results) });
  }),
);

allocationsRouter.post(
  '/copy',
  requireRole('ADMIN', 'MANAGER'),
  validateBody(copyForwardSchema),
  asyncHandler(async (req, res) => {
    const { fromMonth, toMonths, employeeId, projectId } = req.body;
    const results = await copyForwardAllocations(fromMonth, toMonths, { employeeId, projectId });
    res.json({ data: serializeDecimals(results) });
  }),
);
