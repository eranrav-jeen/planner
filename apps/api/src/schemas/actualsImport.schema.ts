import { z } from 'zod';

export const commitImportSchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  // source name -> chosen record id
  employeeMappings: z.record(z.string(), z.string().uuid()).default({}),
  projectMappings: z.record(z.string(), z.string().uuid()).default({}),
  saveAliases: z.boolean().default(true),
});

export type CommitImportInput = z.infer<typeof commitImportSchema>;
