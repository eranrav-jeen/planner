import { z } from 'zod';

export const roleEnum = z.enum(['ADMIN', 'MANAGER', 'VIEWER']);

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: roleEnum.default('VIEWER'),
  employeeId: z.string().uuid().optional().nullable(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: roleEnum.optional(),
  employeeId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});
