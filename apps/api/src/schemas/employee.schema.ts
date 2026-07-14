import { z } from 'zod';

export const employmentTypeEnum = z.enum(['full_time', 'part_time', 'contractor']);

export const employeeInputSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  title: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  employmentType: employmentTypeEnum.default('full_time'),
  monthlyCapacityHours: z.coerce.number().min(0).default(186),
  costRateHourly: z.coerce.number().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
  startDate: z.coerce.date().optional().nullable(),
});

export const employeeListQuerySchema = z.object({
  search: z.string().optional(),
  department: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sort: z.string().optional(),
});
