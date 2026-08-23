import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { allocationRangeQuerySchema } from '../schemas/allocation.schema.js';
import { parseMonthParam } from '../lib/month.js';
import { serializeDecimals } from '../lib/serialize.js';
import { getAccessScope, intersectProjectIds } from '../lib/accessScope.js';

// Allocations are read-only: planned hours are produced solely by the milestone
// roll-up (see milestones.service) and actual hours solely by the attendance
// import. There is no manual write path — the planning grid is a view.
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
