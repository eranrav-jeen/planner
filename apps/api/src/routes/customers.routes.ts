import { Router } from 'express';
import type { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { customerInputSchema, customerListQuerySchema } from '../schemas/customer.schema.js';
import { toSkipTake } from '../lib/pagination.js';
import { serializeDecimals } from '../lib/serialize.js';
import { ApiError } from '../middleware/error.js';
import { assertDeletable } from '../lib/prismaErrors.js';

export const customersRouter = Router();
customersRouter.use(requireAuth);

customersRouter.get(
  '/',
  validateQuery(customerListQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, status, page, pageSize } = req.query as unknown as z.infer<
      typeof customerListQuerySchema
    >;

    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        ...toSkipTake({ page, pageSize }),
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ data: { items: serializeDecimals(items), total, page, pageSize } });
  }),
);

customersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { projects: { orderBy: { name: 'asc' } } },
    });
    if (!customer) throw new ApiError(404, 'Customer not found');
    res.json({ data: serializeDecimals(customer) });
  }),
);

customersRouter.post(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validateBody(customerInputSchema),
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.create({ data: req.body });
    res.status(201).json({ data: serializeDecimals(customer) });
  }),
);

customersRouter.put(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  validateBody(customerInputSchema),
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: serializeDecimals(customer) });
  }),
);

customersRouter.delete(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    try {
      await prisma.customer.delete({ where: { id: req.params.id } });
    } catch (err) {
      assertDeletable(err, 'Cannot delete this customer while it still has projects. Delete those first.');
    }
    res.json({ data: { ok: true } });
  }),
);
