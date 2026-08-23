import { z } from 'zod';

const monthParam = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Expected YYYY-MM');

export const allocationRangeQuerySchema = z.object({
  from: monthParam,
  to: monthParam,
  employeeId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});
