import { z } from 'zod';

const monthParam = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Expected YYYY-MM');

export const capacityOverrideRangeQuerySchema = z.object({
  from: monthParam,
  to: monthParam,
  employeeId: z.string().uuid().optional(),
});

export const capacityOverrideInputSchema = z.object({
  employeeId: z.string().uuid(),
  month: monthParam,
  capacityHours: z.coerce.number().min(0),
  reason: z.string().optional().nullable(),
});
