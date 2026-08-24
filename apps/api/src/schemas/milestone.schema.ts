import { z } from 'zod';

export const WORK_TYPES = [
  'specification',
  'design',
  'development',
  'testing',
  'research',
  'training_materials',
  'project_management',
] as const;

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const milestoneLineSchema = z.object({
  employeeId: z.string().uuid(),
  workType: z.enum(WORK_TYPES),
  effortPct: z.number().positive().max(100),
});

export const milestoneInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    startDate: dateStr,
    endDate: dateStr,
    lines: z.array(milestoneLineSchema).default([]),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type MilestoneInput = z.infer<typeof milestoneInputSchema>;
