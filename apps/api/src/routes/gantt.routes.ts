import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { ganttQuerySchema } from '../schemas/gantt.schema.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { serializeDecimals } from '../lib/serialize.js';
import { getGanttProjects } from '../services/gantt.service.js';

export const ganttRouter = Router();
ganttRouter.use(requireAuth);

ganttRouter.get(
  '/projects',
  validateQuery(ganttQuerySchema),
  asyncHandler(async (req, res) => {
    const { customerId, from, to } = req.query as unknown as { customerId?: string; from?: Date; to?: Date };
    const result = await getGanttProjects({ customerId, from, to });
    res.json({ data: serializeDecimals(result) });
  }),
);
