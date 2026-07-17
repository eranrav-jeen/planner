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
import { getAccessScope, intersectProjectIds, isProjectAccessible } from '../lib/accessScope.js';
import { ApiError } from '../middleware/error.js';

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

    const scopedProjectIds = intersectProjectIds(await getAccessScope(req), projectId);

    const items = await prisma.monthlyAllocation.findMany({
      where: {
        month: { gte: parseMonthParam(from), lte: parseMonthParam(to) },
        ...(employeeId ? { employeeId } : {}),
        ...(scopedProjectIds !== undefined ? { projectId: { in: scopedProjectIds } } : {}),
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
    const scope = await getAccessScope(req);
    if (scope !== null) {
      const offLimits = req.body.items.find((item: { projectId: string }) => !isProjectAccessible(scope, item.projectId));
      if (offLimits) throw new ApiError(403, 'You do not have access to one or more of these projects');
    }
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
    const scope = await getAccessScope(req);
    if (scope !== null && projectId && !isProjectAccessible(scope, projectId)) {
      throw new ApiError(403, 'You do not have access to this project');
    }
    const results = await copyForwardAllocations(fromMonth, toMonths, {
      employeeId,
      projectId,
      restrictToProjectIds: scope?.projectIds,
    });
    res.json({ data: serializeDecimals(results) });
  }),
);
