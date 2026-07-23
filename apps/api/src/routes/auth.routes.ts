import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema, forgotPasswordSchema, setPasswordSchema } from '../schemas/auth.schema.js';
import { AUTH_COOKIE_NAME, authCookieOptions, signToken } from '../lib/jwt.js';
import { ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { createPasswordToken, findValidToken } from '../lib/passwordTokens.js';
import { buildResetEmail } from '../emails/accountEmails.js';
import { sendMail, isMailConfigured } from '../lib/mailer.js';
import { env } from '../lib/env.js';

function buildActionUrl(path: string, token: string): string {
  const base = env.appBaseUrl.replace(/\/$/, '');
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

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

// Self-service password reset request. Always returns ok so the endpoint can't
// be used to discover which emails have accounts.
authRouter.post(
  '/forgot-password',
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body as { email: string };
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.isActive && isMailConfigured()) {
      const token = await createPasswordToken(user.id, 'reset');
      const { subject, html, text } = buildResetEmail(user, buildActionUrl('/set-password', token));
      try {
        await sendMail({ to: user.email, subject, html, text });
      } catch {
        // Swallow send errors so we don't leak account existence or SMTP state.
      }
    }
    res.json({ data: { ok: true } });
  }),
);

// Validate a set-password / invite token (for the page to greet the user or show
// an "expired link" message). Returns the associated email when valid.
authRouter.get(
  '/set-password/:token',
  asyncHandler(async (req, res) => {
    const token = await findValidToken(req.params.token);
    if (!token) throw new ApiError(400, 'This link is invalid or has expired.');
    const user = await prisma.user.findUnique({ where: { id: token.userId } });
    if (!user) throw new ApiError(400, 'This link is invalid or has expired.');
    res.json({ data: { email: user.email, purpose: token.purpose } });
  }),
);

// Consume a token and set the user's password.
authRouter.post(
  '/set-password',
  validateBody(setPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token: raw, password } = req.body as { token: string; password: string };
    const token = await findValidToken(raw);
    if (!token) throw new ApiError(400, 'This link is invalid or has expired.');
    await prisma.$transaction([
      prisma.user.update({
        where: { id: token.userId },
        data: { passwordHash: await bcrypt.hash(password, 10) },
      }),
      prisma.passwordSetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    ]);
    res.json({ data: { ok: true } });
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
