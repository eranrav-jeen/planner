import crypto from 'node:crypto';
import { prisma } from './prisma.js';

export type TokenPurpose = 'invite' | 'reset';

// Invite links are long-lived (a new hire may not act immediately); reset links
// are short-lived for security.
const TTL_HOURS: Record<TokenPurpose, number> = { invite: 7 * 24, reset: 1 };

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// Create a one-time token for a user, storing only its hash. Returns the raw
// token to embed in the emailed link.
export async function createPasswordToken(userId: string, purpose: TokenPurpose): Promise<string> {
  const raw = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TTL_HOURS[purpose] * 60 * 60 * 1000);
  // Invalidate any outstanding tokens of the same purpose so only the newest link works.
  await prisma.passwordSetToken.deleteMany({ where: { userId, purpose, usedAt: null } });
  await prisma.passwordSetToken.create({ data: { userId, purpose, tokenHash: hashToken(raw), expiresAt } });
  return raw;
}

// Look up a still-valid token by its raw value. Returns the record or null.
export async function findValidToken(raw: string) {
  if (!raw) return null;
  const token = await prisma.passwordSetToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!token || token.usedAt || token.expiresAt < new Date()) return null;
  return token;
}

export async function markTokenUsed(id: string): Promise<void> {
  await prisma.passwordSetToken.update({ where: { id }, data: { usedAt: new Date() } });
}
