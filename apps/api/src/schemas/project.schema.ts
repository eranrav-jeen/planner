import { z } from 'zod';

export const projectStatusEnum = z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']);
export const billingTypeEnum = z.enum(['fixed_price', 'time_and_materials']);

export const projectInputSchema = z.object({
  customerId: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().min(1),
  status: projectStatusEnum.default('planning'),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  incomeAmount: z.coerce.number().min(0).default(0),
  hoursPaid: z.coerce.number().min(0).default(0),
  currency: z.string().default('ILS'),
  billingType: billingTypeEnum.default('time_and_materials'),
  description: z.string().optional().nullable(),
  githubRepoUrl: z.string().url().optional().nullable().or(z.literal('')),
  jiraBoardUrl: z.string().url().optional().nullable().or(z.literal('')),
});

export const projectListQuerySchema = z.object({
  search: z.string().optional(),
  status: projectStatusEnum.optional(),
  customerId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sort: z.string().optional(),
});

export const assignmentInputSchema = z.object({
  employeeId: z.string().uuid(),
  roleOnProject: z.string().optional().nullable(),
});
