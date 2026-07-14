import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema } from '../schemas/auth.schema.js';
import { AUTH_COOKIE_NAME, authCookieOptions, signToken } from '../lib/jwt.js';
import { ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
    res.json({ data: { token, user: { id: user.id, email: user.email, role: user.role } } });
  }),
);

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
  res.json({ data: { ok: true } });
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      throw new ApiError(401, 'User no longer exists');
    }
    res.json({ data: { id: user.id, email: user.email, role: user.role, employeeId: user.employeeId } });
  }),
);
