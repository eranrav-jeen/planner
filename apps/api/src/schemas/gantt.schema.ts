import { z } from 'zod';

export const ganttQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
