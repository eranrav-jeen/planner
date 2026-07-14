import jwt from 'jsonwebtoken';
import { env } from './env.js';
import type { Role } from '@prisma/client';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

const TOKEN_TTL = '7d';

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}

export const AUTH_COOKIE_NAME = 'jeen_session';

export const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};
