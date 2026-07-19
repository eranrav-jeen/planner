import { z } from 'zod';

const monthParam = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Expected YYYY-MM');

export const monthRangeQuerySchema = z.object({
  from: monthParam,
  to: monthParam,
  employeeId: z.string().uuid().optional(),
  department: z.string().optional(),
});

export const projectFilterQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  status: z.string().optional(),
});

export const planActualQuerySchema = z.object({
  from: monthParam,
  to: monthParam,
  customerId: z.string().uuid().optional(),
});
