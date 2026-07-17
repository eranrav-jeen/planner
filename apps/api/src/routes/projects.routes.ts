import fs from 'node:fs';
import path from 'node:path';
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
import { PO_UPLOAD_DIR, decodeOriginalFilename, poUpload } from '../lib/uploads.js';
import { getAccessScope, intersectProjectIds, isProjectAccessible, requireProjectAccess } from '../lib/accessScope.js';

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

projectsRouter.get(
  '/',
  validateQuery(projectListQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, status, customerId, page, pageSize } = req.query as unknown as z.infer<
      typeof projectListQuerySchema
    >;

    const scope = await getAccessScope(req);

    const where = {
      ...(scope !== null ? { id: { in: scope.projectIds } } : {}),
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
    if (!isProjectAccessible(await getAccessScope(req), req.params.id)) {
      throw new ApiError(404, 'Project not found');
    }
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
    // A restricted Manager who creates a project wouldn't otherwise have
    // access to what they just made — grant it automatically.
    if (req.user!.isRestricted) {
      await prisma.projectAccess.create({ data: { userId: req.user!.id, projectId: project.id } });
    }
    res.status(201).json({ data: serializeDecimals(project) });
  }),
);

projectsRouter.put(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  requireProjectAccess('id'),
  validateBody(projectInputSchema),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: serializeDecimals(project) });
  }),
);

projectsRouter.delete(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  requireProjectAccess('id'),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    try {
      await prisma.project.delete({ where: { id: req.params.id } });
    } catch (err) {
      assertDeletable(err, 'Cannot delete this project.');
    }
    if (project?.poStoredName) {
      await fs.promises.unlink(path.join(PO_UPLOAD_DIR, project.poStoredName)).catch(() => {});
    }
    res.json({ data: { ok: true } });
  }),
);

projectsRouter.post(
  '/:id/po',
  requireRole('ADMIN', 'MANAGER'),
  requireProjectAccess('id'),
  poUpload.single('file'),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) throw new ApiError(404, 'Project not found');
    if (!req.file) throw new ApiError(422, 'No file uploaded');

    if (project.poStoredName) {
      await fs.promises.unlink(path.join(PO_UPLOAD_DIR, project.poStoredName)).catch(() => {});
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        poFileName: decodeOriginalFilename(req.file.originalname),
        poStoredName: req.file.filename,
        poMimeType: req.file.mimetype,
        poFileSize: req.file.size,
        poUploadedAt: new Date(),
      },
    });
    res.json({ data: serializeDecimals(updated) });
  }),
);

projectsRouter.get(
  '/:id/po',
  asyncHandler(async (req, res) => {
    if (!isProjectAccessible(await getAccessScope(req), req.params.id)) {
      throw new ApiError(404, 'No purchase order attached');
    }
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project?.poStoredName) throw new ApiError(404, 'No purchase order attached');
    res.download(path.join(PO_UPLOAD_DIR, project.poStoredName), project.poFileName ?? 'purchase-order');
  }),
);

projectsRouter.delete(
  '/:id/po',
  requireRole('ADMIN', 'MANAGER'),
  requireProjectAccess('id'),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) throw new ApiError(404, 'Project not found');

    if (project.poStoredName) {
      await fs.promises.unlink(path.join(PO_UPLOAD_DIR, project.poStoredName)).catch(() => {});
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { poFileName: null, poStoredName: null, poMimeType: null, poFileSize: null, poUploadedAt: null },
    });
    res.json({ data: serializeDecimals(updated) });
  }),
);

projectsRouter.get(
  '/:id/assignments',
  requireProjectAccess('id'),
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
  requireProjectAccess('id'),
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
    const scope = await getAccessScope(req);
    const scopedProjectIds = intersectProjectIds(scope, projectId);
    const assignments = await prisma.projectAssignment.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        ...(scopedProjectIds !== undefined ? { projectId: { in: scopedProjectIds } } : {}),
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
    const assignment = await prisma.projectAssignment.findUnique({ where: { id: req.params.id } });
    if (!assignment) throw new ApiError(404, 'Assignment not found');
    if (!isProjectAccessible(await getAccessScope(req), assignment.projectId)) {
      throw new ApiError(403, 'You do not have access to this project');
    }
    await prisma.projectAssignment.delete({ where: { id: req.params.id } });
    res.json({ data: { ok: true } });
  }),
);
