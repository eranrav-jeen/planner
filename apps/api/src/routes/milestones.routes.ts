import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { ApiError } from '../middleware/error.js';
import { requireProjectAccess } from '../lib/accessScope.js';
import {
  milestoneInputSchema,
  milestoneReorderSchema,
  type MilestoneInput,
} from '../schemas/milestone.schema.js';
import { getMilestonesView, recomputeProjectMilestoneAllocations } from '../services/milestones.service.js';

// Mounted at /api/projects/:projectId/milestones (mergeParams gives projectId).
export const milestonesRouter = Router({ mergeParams: true });

milestonesRouter.use(requireAuth);
milestonesRouter.use(requireProjectAccess('projectId'));

async function ensureProjectExists(projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) throw new ApiError(404, 'Project not found');
}

async function ensureMilestoneInProject(projectId: string, milestoneId: string): Promise<void> {
  const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId }, select: { projectId: true } });
  if (!milestone || milestone.projectId !== projectId) throw new ApiError(404, 'Milestone not found');
}

const lineCreateData = (input: MilestoneInput) =>
  input.lines.map((l) => ({ employeeId: l.employeeId, workType: l.workType, effortPct: l.effortPct }));

// List milestones for a project (with computed timeline + hours).
milestonesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { projectId } = req.params as { projectId: string };
    await ensureProjectExists(projectId);
    res.json({ data: await getMilestonesView(projectId) });
  }),
);

// Reorder — must be declared before '/:milestoneId' so it isn't shadowed.
milestonesRouter.put(
  '/reorder',
  requireRole('ADMIN', 'MANAGER'),
  validateBody(milestoneReorderSchema),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params as { projectId: string };
    const { order } = req.body as { order: string[] };
    const existing = await prisma.milestone.findMany({ where: { projectId }, select: { id: true } });
    const ids = new Set(existing.map((m) => m.id));
    if (order.length !== ids.size || order.some((id) => !ids.has(id))) {
      throw new ApiError(400, 'Order must list exactly the milestones of this project');
    }
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < order.length; i += 1) {
        await tx.milestone.update({ where: { id: order[i] }, data: { sortOrder: i } });
      }
      await recomputeProjectMilestoneAllocations(projectId, tx);
    });
    res.json({ data: await getMilestonesView(projectId) });
  }),
);

// Create a milestone (appended at the end).
milestonesRouter.post(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validateBody(milestoneInputSchema),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params as { projectId: string };
    await ensureProjectExists(projectId);
    const input = req.body as MilestoneInput;
    const max = await prisma.milestone.aggregate({ where: { projectId }, _max: { sortOrder: true } });
    const sortOrder = (max._max.sortOrder ?? -1) + 1;
    await prisma.$transaction(async (tx) => {
      await tx.milestone.create({
        data: {
          projectId,
          name: input.name,
          durationWeeks: input.durationWeeks,
          sortOrder,
          lines: { create: lineCreateData(input) },
        },
      });
      await recomputeProjectMilestoneAllocations(projectId, tx);
    });
    res.status(201).json({ data: await getMilestonesView(projectId) });
  }),
);

// Update a milestone (name, duration, and full replacement of its lines).
milestonesRouter.put(
  '/:milestoneId',
  requireRole('ADMIN', 'MANAGER'),
  validateBody(milestoneInputSchema),
  asyncHandler(async (req, res) => {
    const { projectId, milestoneId } = req.params as { projectId: string; milestoneId: string };
    await ensureMilestoneInProject(projectId, milestoneId);
    const input = req.body as MilestoneInput;
    await prisma.$transaction(async (tx) => {
      await tx.milestoneAssignment.deleteMany({ where: { milestoneId } });
      await tx.milestone.update({
        where: { id: milestoneId },
        data: {
          name: input.name,
          durationWeeks: input.durationWeeks,
          lines: { create: lineCreateData(input) },
        },
      });
      await recomputeProjectMilestoneAllocations(projectId, tx);
    });
    res.json({ data: await getMilestonesView(projectId) });
  }),
);

// Delete a milestone (and resequence the rest).
milestonesRouter.delete(
  '/:milestoneId',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const { projectId, milestoneId } = req.params as { projectId: string; milestoneId: string };
    await ensureMilestoneInProject(projectId, milestoneId);
    await prisma.$transaction(async (tx) => {
      await tx.milestone.delete({ where: { id: milestoneId } });
      const remaining = await tx.milestone.findMany({
        where: { projectId },
        orderBy: { sortOrder: 'asc' },
        select: { id: true },
      });
      for (let i = 0; i < remaining.length; i += 1) {
        await tx.milestone.update({ where: { id: remaining[i].id }, data: { sortOrder: i } });
      }
      await recomputeProjectMilestoneAllocations(projectId, tx);
    });
    res.json({ data: await getMilestonesView(projectId) });
  }),
);
