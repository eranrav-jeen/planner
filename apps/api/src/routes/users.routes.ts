import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema.js';
import { ApiError } from '../middleware/error.js';
import { assertDeletable } from '../lib/prismaErrors.js';
import { sendMail, isMailConfigured } from '../lib/mailer.js';
import { buildInviteEmail } from '../emails/accountEmails.js';
import { createPasswordToken } from '../lib/passwordTokens.js';
import { env } from '../lib/env.js';
import crypto from 'node:crypto';

// Email a user an invite link to set their own password. Returns whether it sent.
async function sendInvite(user: { id: string; email: string; role: string }): Promise<boolean> {
  if (!isMailConfigured()) return false;
  const token = await createPasswordToken(user.id, 'invite');
  const base = env.appBaseUrl.replace(/\/$/, '');
  const url = `${base}/set-password?token=${encodeURIComponent(token)}`;
  const { subject, html, text } = buildInviteEmail(user, url);
  await sendMail({ to: user.email, subject, html, text });
  return true;
}

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

    // If the admin didn't set a password, store an unusable random hash so the
    // account can't be logged into until the user sets their own via the invite.
    const passwordHash = await bcrypt.hash(password || crypto.randomBytes(32).toString('hex'), 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        employeeId: employeeId ?? null,
        isRestricted: isRestricted ?? false,
      },
    });
    await syncProjectAccess(user.id, projectAccessIds);

    // No password provided => email an invite so the user sets their own.
    let invited = false;
    if (!password) {
      try {
        invited = await sendInvite(user);
      } catch {
        invited = false; // account still created; admin can resend the invite
      }
    }

    const withAccess = await prisma.user.findUnique({
      where: { id: user.id },
      include: { projectAccess: { select: { projectId: true } } },
    });
    res.status(201).json({ data: { ...toSafeUser(withAccess!), invited } });
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

// (Re)send the invite / set-password link to a user.
usersRouter.post(
  '/:id/invite',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new ApiError(404, 'User not found');
    if (!isMailConfigured()) {
      throw new ApiError(500, 'Email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in the API environment.');
    }
    try {
      await sendInvite(user);
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
