import { z } from 'zod';

const monthParam = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Expected YYYY-MM');

export const allocationRangeQuerySchema = z.object({
  from: monthParam,
  to: monthParam,
  employeeId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

export const allocationItemSchema = z.object({
  employeeId: z.string().uuid(),
  projectId: z.string().uuid(),
  month: monthParam,
  plannedHours: z.coerce.number().min(0),
  actualHours: z.coerce.number().min(0).optional().nullable(),
  note: z.string().optional().nullable(),
});

export const bulkUpsertAllocationsSchema = z.object({
  items: z.array(allocationItemSchema).min(1),
});

export const copyForwardSchema = z.object({
  fromMonth: monthParam,
  toMonths: z.array(monthParam).min(1),
  employeeId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});
