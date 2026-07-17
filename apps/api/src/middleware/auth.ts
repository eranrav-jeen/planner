import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { AUTH_COOKIE_NAME, verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { ApiError } from './error.js';
import { asyncHandler } from '../lib/asyncHandler.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: Role; isRestricted: boolean };
    }
  }
}

// Looks up role/isRestricted/isActive fresh from the DB on every request rather
// than trusting the (up to 7-day-old) JWT claims, so an admin toggling a
// user's role, restriction, or active status takes effect immediately instead
// of waiting for that user's next login.
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice('Bearer '.length)
    : undefined;
  const token = req.cookies?.[AUTH_COOKIE_NAME] ?? bearer;

  if (!token) {
    throw new ApiError(401, 'Not authenticated');
  }

  let userId: string;
  try {
    userId = verifyToken(token).sub;
  } catch {
    throw new ApiError(401, 'Invalid or expired session');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid or expired session');
  }

  req.user = { id: user.id, email: user.email, role: user.role, isRestricted: user.isRestricted };
  next();
});

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Not authenticated'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    next();
  };
}
