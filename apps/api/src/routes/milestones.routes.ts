import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { ApiError } from '../middleware/error.js';
import { requireProjectAccess } from '../lib/accessScope.js';
import { milestoneInputSchema, type MilestoneInput } from '../schemas/milestone.schema.js';
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

// Parse a YYYY-MM-DD date string as a UTC calendar date (matches @db.Date).
const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);

const lineCreateData = (input: MilestoneInput) =>
  input.lines.map((l) => ({ employeeId: l.employeeId, workType: l.workType, effortPct: l.effortPct }));

// List milestones for a project (ordered by start date, with computed hours).
milestonesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { projectId } = req.params as { projectId: string };
    await ensureProjectExists(projectId);
    res.json({ data: await getMilestonesView(projectId) });
  }),
);

// Create a milestone.
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
          startDate: toDate(input.startDate),
          endDate: toDate(input.endDate),
          sortOrder,
          lines: { create: lineCreateData(input) },
        },
      });
      await recomputeProjectMilestoneAllocations(projectId, tx);
    });
    res.status(201).json({ data: await getMilestonesView(projectId) });
  }),
);

// Update a milestone (name, dates, and full replacement of its lines).
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
          startDate: toDate(input.startDate),
          endDate: toDate(input.endDate),
          lines: { create: lineCreateData(input) },
        },
      });
      await recomputeProjectMilestoneAllocations(projectId, tx);
    });
    res.json({ data: await getMilestonesView(projectId) });
  }),
);

// Delete a milestone.
milestonesRouter.delete(
  '/:milestoneId',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const { projectId, milestoneId } = req.params as { projectId: string; milestoneId: string };
    await ensureMilestoneInProject(projectId, milestoneId);
    await prisma.$transaction(async (tx) => {
      await tx.milestone.delete({ where: { id: milestoneId } });
      await recomputeProjectMilestoneAllocations(projectId, tx);
    });
    res.json({ data: await getMilestonesView(projectId) });
  }),
);
