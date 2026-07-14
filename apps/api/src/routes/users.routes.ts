import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema.js';
import { ApiError } from '../middleware/error.js';
import { assertDeletable } from '../lib/prismaErrors.js';

export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole('ADMIN'));

function toSafeUser(user: { id: string; email: string; role: string; employeeId: string | null; isActive: boolean; createdAt: Date }) {
  const { id, email, role, employeeId, isActive, createdAt } = user;
  return { id, email, role, employeeId, isActive, createdAt };
}

usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { email: 'asc' } });
    res.json({ data: users.map(toSafeUser) });
  }),
);

usersRouter.post(
  '/',
  validateBody(createUserSchema),
  asyncHandler(async (req, res) => {
    const { email, password, role, employeeId } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(422, 'A user with this email already exists', { email: 'Already in use' });

    const user = await prisma.user.create({
      data: { email, passwordHash: await bcrypt.hash(password, 10), role, employeeId: employeeId ?? null },
    });
    res.status(201).json({ data: toSafeUser(user) });
  }),
);

usersRouter.put(
  '/:id',
  validateBody(updateUserSchema),
  asyncHandler(async (req, res) => {
    const { password, ...rest } = req.body;
    const data: Record<string, unknown> = { ...rest };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json({ data: toSafeUser(user) });
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
