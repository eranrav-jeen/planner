import { Prisma } from '@prisma/client';
import { ApiError } from '../middleware/error.js';

export function assertDeletable(err: unknown, conflictMessage: string): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2003' || err.code === 'P2014')) {
    throw new ApiError(409, conflictMessage);
  }
  throw err;
}
