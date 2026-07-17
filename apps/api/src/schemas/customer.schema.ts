import { z } from 'zod';

export const customerStatusEnum = z.enum(['active', 'prospect', 'inactive']);

export const LICENSE_PLATFORM_VERSIONS = [
  '4.1',
  '5.2',
  '5.2.1',
  '5.2.2',
  '5.2.3',
  '5.2.4',
  '5.2.5',
  '5.2.6',
  '5.2.7',
  '5.2.8',
  '5.2.9',
  '5.3',
  '5.4',
  '5.5',
  '5.6',
  '5.7',
  '5.8',
  '5.9',
  '6.1',
] as const;

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
  licensePlatformVersion: z.enum(LICENSE_PLATFORM_VERSIONS).optional().nullable(),
  licenseModelsInstalled: z.array(z.string().min(1).max(80)).max(50).default([]),
});

export const customerListQuerySchema = z.object({
  search: z.string().optional(),
  status: customerStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sort: z.string().optional(),
});
