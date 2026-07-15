import { Router } from 'express';
import type { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  assignmentInputSchema,
  projectInputSchema,
  projectListQuerySchema,
} from '../schemas/project.schema.js';
import { toSkipTake } from '../lib/pagination.js';
import { serializeDecimals } from '../lib/serialize.js';
import { ApiError } from '../middleware/error.js';
import { assertDeletable } from '../lib/prismaErrors.js';

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

projectsRouter.get(
  '/',
  validateQuery(projectListQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, status, customerId, page, pageSize } = req.query as unknown as z.infer<
      typeof projectListQuerySchema
    >;

    const where = {
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { code: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: { customer: true },
        orderBy: { startDate: 'desc' },
        ...toSkipTake({ page, pageSize }),
      }),
      prisma.project.count({ where }),
    ]);

    res.json({ data: { items: serializeDecimals(items), total, page, pageSize } });
  }),
);

projectsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        assignments: { include: { employee: true } },
      },
    });
    if (!project) throw new ApiError(404, 'Project not found');

    const agg = await prisma.monthlyAllocation.aggregate({
      where: { projectId: project.id },
      _sum: { plannedHours: true, actualHours: true },
    });
    const consumed = Number(agg._sum.actualHours ?? agg._sum.plannedHours ?? 0);

    res.json({
      data: {
        ...serializeDecimals(project),
        burn: {
          hoursPaid: Number(project.hoursPaid),
          consumed,
          remaining: Number(project.hoursPaid) - consumed,
        },
      },
    });
  }),
);

projectsRouter.post(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validateBody(projectInputSchema),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.create({ data: req.body });
    res.status(201).json({ data: serializeDecimals(project) });
  }),
);

projectsRouter.put(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  validateBody(projectInputSchema),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: serializeDecimals(project) });
  }),
);

projectsRouter.delete(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    try {
      await prisma.project.delete({ where: { id: req.params.id } });
    } catch (err) {
      assertDeletable(err, 'Cannot delete this project.');
    }
    res.json({ data: { ok: true } });
  }),
);

projectsRouter.get(
  '/:id/assignments',
  asyncHandler(async (req, res) => {
    const assignments = await prisma.projectAssignment.findMany({
      where: { projectId: req.params.id },
      include: { employee: true },
    });
    res.json({ data: serializeDecimals(assignments) });
  }),
);

projectsRouter.post(
  '/:id/assignments',
  requireRole('ADMIN', 'MANAGER'),
  validateBody(assignmentInputSchema),
  asyncHandler(async (req, res) => {
    const assignment = await prisma.projectAssignment.create({
      data: { projectId: req.params.id, employeeId: req.body.employeeId, roleOnProject: req.body.roleOnProject },
    });
    res.status(201).json({ data: assignment });
  }),
);

export const assignmentsRouter = Router();
assignmentsRouter.use(requireAuth);

assignmentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { employeeId, projectId } = req.query as { employeeId?: string; projectId?: string };
    const assignments = await prisma.projectAssignment.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        ...(projectId ? { projectId } : {}),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, monthlyCapacityHours: true } },
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            customer: { select: { id: true, name: true } },
          },
        },
      },
    });
    res.json({ data: serializeDecimals(assignments) });
  }),
);

assignmentsRouter.delete(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    await prisma.projectAssignment.delete({ where: { id: req.params.id } });
    res.json({ data: { ok: true } });
  }),
);
