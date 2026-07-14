import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { AUTH_COOKIE_NAME, verifyToken } from '../lib/jwt.js';
import { ApiError } from './error.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: Role };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice('Bearer '.length)
    : undefined;
  const token = req.cookies?.[AUTH_COOKIE_NAME] ?? bearer;

  if (!token) {
    return next(new ApiError(401, 'Not authenticated'));
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired session'));
  }
}

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
