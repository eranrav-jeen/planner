import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema.js';
import { ApiError } from '../middleware/error.js';
import { assertDeletable } from '../lib/prismaErrors.js';
import { sendMail } from '../lib/mailer.js';
import { buildWelcomeEmail } from '../emails/welcomeEmail.js';

export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole('ADMIN'));

type UserWithAccess = {
  id: string;
  email: string;
  role: string;
  employeeId: string | null;
  isActive: boolean;
  isRestricted: boolean;
  createdAt: Date;
  projectAccess: { projectId: string }[];
};

function toSafeUser(user: UserWithAccess) {
  const { id, email, role, employeeId, isActive, isRestricted, createdAt, projectAccess } = user;
  return {
    id,
    email,
    role,
    employeeId,
    isActive,
    isRestricted,
    createdAt,
    projectAccessIds: projectAccess.map((a) => a.projectId),
  };
}

async function syncProjectAccess(userId: string, projectAccessIds: string[] | undefined) {
  if (projectAccessIds === undefined) return;
  await prisma.$transaction([
    prisma.projectAccess.deleteMany({ where: { userId } }),
    prisma.projectAccess.createMany({
      data: [...new Set(projectAccessIds)].map((projectId) => ({ userId, projectId })),
    }),
  ]);
}

usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { email: 'asc' },
      include: { projectAccess: { select: { projectId: true } } },
    });
    res.json({ data: users.map(toSafeUser) });
  }),
);

usersRouter.post(
  '/',
  validateBody(createUserSchema),
  asyncHandler(async (req, res) => {
    const { email, password, role, employeeId, isRestricted, projectAccessIds } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(422, 'A user with this email already exists', { email: 'Already in use' });

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role,
        employeeId: employeeId ?? null,
        isRestricted: isRestricted ?? false,
      },
    });
    await syncProjectAccess(user.id, projectAccessIds);

    const withAccess = await prisma.user.findUnique({
      where: { id: user.id },
      include: { projectAccess: { select: { projectId: true } } },
    });
    res.status(201).json({ data: toSafeUser(withAccess!) });
  }),
);

usersRouter.put(
  '/:id',
  validateBody(updateUserSchema),
  asyncHandler(async (req, res) => {
    const { password, projectAccessIds, ...rest } = req.body;
    const data: Record<string, unknown> = { ...rest };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    await syncProjectAccess(user.id, projectAccessIds);

    const withAccess = await prisma.user.findUnique({
      where: { id: user.id },
      include: { projectAccess: { select: { projectId: true } } },
    });
    res.json({ data: toSafeUser(withAccess!) });
  }),
);

usersRouter.post(
  '/:id/welcome-email',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new ApiError(404, 'User not found');

    const { subject, html, text } = buildWelcomeEmail(user);
    try {
      await sendMail({ to: user.email, subject, html, text });
    } catch (err) {
      throw new ApiError(500, err instanceof Error ? err.message : 'Failed to send email');
    }
    res.json({ data: { ok: true } });
  }),
);

usersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.id) {
      throw new ApiError(400, 'You cannot delete your own account');
    }
    try {
      await prisma.user.delete({ where: { id: req.params.id } });
    } catch (err) {
      assertDeletable(err, 'Cannot delete this user.');
    }
    res.json({ data: { ok: true } });
  }),
);
