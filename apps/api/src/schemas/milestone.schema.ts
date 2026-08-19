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

export const milestoneLineSchema = z.object({
  employeeId: z.string().uuid(),
  workType: z.enum(WORK_TYPES),
  effortPct: z.number().positive().max(100),
});

export const milestoneInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  durationWeeks: z.number().int().min(1).max(520),
  lines: z.array(milestoneLineSchema).default([]),
});

export const milestoneReorderSchema = z.object({
  order: z.array(z.string().uuid()).min(1),
});

export type MilestoneInput = z.infer<typeof milestoneInputSchema>;
