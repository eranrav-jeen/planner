import { z } from 'zod';

export const customerStatusEnum = z.enum(['active', 'prospect', 'inactive']);

export const customerInputSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal('')),
  status: customerStatusEnum.default('prospect'),
  notes: z.string().optional().nullable(),
  hasLicense: z.boolean().default(false),
  licenseAnnualAmount: z.coerce.number().min(0).optional().nullable(),
  licensePeriodStart: z.coerce.date().optional().nullable(),
  licensePeriodEnd: z.coerce.date().optional().nullable(),
  licensePaid: z.boolean().default(false),
});

export const customerListQuerySchema = z.object({
  search: z.string().optional(),
  status: customerStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sort: z.string().optional(),
});
