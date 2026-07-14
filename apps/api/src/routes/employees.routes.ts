import { Router } from 'express';
import type { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { employeeInputSchema, employeeListQuerySchema } from '../schemas/employee.schema.js';
import { toSkipTake } from '../lib/pagination.js';
import { serializeDecimals } from '../lib/serialize.js';
import { ApiError } from '../middleware/error.js';
import type { Request } from 'express';

export const employeesRouter = Router();
employeesRouter.use(requireAuth);

function redactCostRate<T extends { costRateHourly?: unknown }>(req: Request, employee: T): T {
  if (req.user?.role === 'VIEWER') {
    const { costRateHourly: _costRateHourly, ...rest } = employee;
    return rest as T;
  }
  return employee;
}

employeesRouter.get(
  '/',
  validateQuery(employeeListQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, department, isActive, page, pageSize } = req.query as unknown as z.infer<
      typeof employeeListQuerySchema
    >;

    const where = {
      ...(department ? { department } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        orderBy: { firstName: 'asc' },
        ...toSkipTake({ page, pageSize }),
      }),
      prisma.employee.count({ where }),
    ]);

    res.json({
      data: { items: items.map((e) => redactCostRate(req, serializeDecimals(e))), total, page, pageSize },
    });
  }),
);

employeesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: { include: { project: true } },
      },
    });
    if (!employee) throw new ApiError(404, 'Employee not found');
    res.json({ data: redactCostRate(req, serializeDecimals(employee)) });
  }),
);

employeesRouter.post(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validateBody(employeeInputSchema),
  asyncHandler(async (req, res) => {
    const employee = await prisma.employee.create({ data: req.body });
    res.status(201).json({ data: serializeDecimals(employee) });
  }),
);

employeesRouter.put(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  validateBody(employeeInputSchema),
  asyncHandler(async (req, res) => {
    const employee = await prisma.employee.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: serializeDecimals(employee) });
  }),
);

employeesRouter.delete(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    await prisma.employee.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ data: { ok: true } });
  }),
);
