import { z } from 'zod';

export const BID_STATUSES = ['evaluating', 'applying', 'submitted', 'won', 'lost', 'no_bid'] as const;
export const BID_STAGE_STATUSES = ['pending', 'done', 'skipped'] as const;

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const optDate = dateStr.nullish();
const optText = z.string().trim().max(5000).nullish();

export const bidCoreSchema = z.object({
  title: z.string().trim().min(1).max(300),
  issuer: z.string().trim().max(300).nullish(),
  description: optText,
  status: z.enum(BID_STATUSES).default('evaluating'),
  submissionDate: optDate,
  winProbability: z.number().int().min(0).max(100).nullish(),
  estimatedValue: z.number().min(0).nullish(),
  budgetNote: z.string().trim().max(300).nullish(),
  competitors: optText,
  partners: optText,
  notes: optText,
  projectId: z.string().uuid().nullish(),
});

export const stagesReplaceSchema = z.object({
  items: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(200),
        dueDate: optDate,
        status: z.enum(BID_STAGE_STATUSES).default('pending'),
        notes: optText,
      }),
    )
    .max(100),
});

export const thresholdsReplaceSchema = z.object({
  items: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(300),
        met: z.boolean().default(false),
        notes: optText,
      }),
    )
    .max(100),
});

export const scoringReplaceSchema = z.object({
  items: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(300),
        weight: z.number().min(0).max(100),
        ourScore: z.number().min(0).max(100).nullish(),
        notes: optText,
      }),
    )
    .max(100),
});

export const paymentsReplaceSchema = z.object({
  items: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(300),
        amount: z.number().min(0),
        dueDate: optDate,
        paid: z.boolean().default(false),
        paidDate: optDate,
        poNumber: z.string().trim().max(100).nullish(),
        notes: optText,
      }),
    )
    .max(200),
});

export type BidCoreInput = z.infer<typeof bidCoreSchema>;
