import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  capacityOverrideInputSchema,
  capacityOverrideRangeQuerySchema,
} from '../schemas/capacityOverride.schema.js';
import { parseMonthParam } from '../lib/month.js';
import { serializeDecimals } from '../lib/serialize.js';
import { ApiError } from '../middleware/error.js';
import { getAccessScope, getAccessibleEmployeeIds } from '../lib/accessScope.js';

export const capacityOverridesRouter = Router();
capacityOverridesRouter.use(requireAuth);

capacityOverridesRouter.get(
  '/',
  validateQuery(capacityOverrideRangeQuerySchema),
  asyncHandler(async (req, res) => {
    const { from, to, employeeId } = req.query as unknown as {
      from: string;
      to: string;
      employeeId?: string;
    };

    const accessibleEmployeeIds = await getAccessibleEmployeeIds(await getAccessScope(req));

    const items = await prisma.capacityOverride.findMany({
      where: {
        month: { gte: parseMonthParam(from), lte: parseMonthParam(to) },
        ...(employeeId ? { employeeId } : {}),
        ...(accessibleEmployeeIds !== null ? { employeeId: { in: accessibleEmployeeIds } } : {}),
      },
    });

    res.json({ data: serializeDecimals(items) });
  }),
);

capacityOverridesRouter.put(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validateBody(capacityOverrideInputSchema),
  asyncHandler(async (req, res) => {
    const accessibleEmployeeIds = await getAccessibleEmployeeIds(await getAccessScope(req));
    if (accessibleEmployeeIds !== null && !accessibleEmployeeIds.includes(req.body.employeeId)) {
      throw new ApiError(403, 'You do not have access to this employee');
    }
    const month = parseMonthParam(req.body.month);
    const override = await prisma.capacityOverride.upsert({
      where: { employeeId_month: { employeeId: req.body.employeeId, month } },
      update: { capacityHours: req.body.capacityHours, reason: req.body.reason ?? null },
      create: {
        employeeId: req.body.employeeId,
        month,
        capacityHours: req.body.capacityHours,
        reason: req.body.reason ?? null,
      },
    });
    res.json({ data: serializeDecimals(override) });
  }),
);

capacityOverridesRouter.delete(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.capacityOverride.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'Capacity override not found');
    const accessibleEmployeeIds = await getAccessibleEmployeeIds(await getAccessScope(req));
    if (accessibleEmployeeIds !== null && !accessibleEmployeeIds.includes(existing.employeeId)) {
      throw new ApiError(403, 'You do not have access to this employee');
    }
    await prisma.capacityOverride.delete({ where: { id: req.params.id } });
    res.json({ data: { ok: true } });
  }),
);
