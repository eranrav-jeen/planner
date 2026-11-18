import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { ApiError } from '../middleware/error.js';
import { serializeDecimals } from '../lib/serialize.js';
import { assertDeletable } from '../lib/prismaErrors.js';
import {
  bidCoreSchema,
  paymentsReplaceSchema,
  scoringReplaceSchema,
  stagesReplaceSchema,
  thresholdsReplaceSchema,
  type BidCoreInput,
} from '../schemas/bid.schema.js';
import {
  DEFAULT_STAGE_LABELS,
  getBidDetail,
  getBidsList,
  getBidsSummary,
  toDate,
} from '../services/bids.service.js';

// Bids hold commercial strategy (competitors, win odds, value), so the whole
// module is restricted to admins and managers.
export const bidsRouter = Router();
bidsRouter.use(requireAuth, requireRole('ADMIN', 'MANAGER'));

function coreData(input: BidCoreInput) {
  return {
    title: input.title,
    issuer: input.issuer ?? null,
    description: input.description ?? null,
    status: input.status,
    submissionDate: toDate(input.submissionDate),
    winProbability: input.winProbability ?? null,
    estimatedValue: input.estimatedValue ?? null,
    budgetNote: input.budgetNote ?? null,
    competitors: input.competitors ?? null,
    partners: input.partners ?? null,
    notes: input.notes ?? null,
    projectId: input.projectId ?? null,
  };
}

async function ensureBid(id: string): Promise<void> {
  const bid = await prisma.bid.findUnique({ where: { id }, select: { id: true } });
  if (!bid) throw new ApiError(404, 'Bid not found');
}

bidsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ data: serializeDecimals(await getBidsList()) });
  }),
);

bidsRouter.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    res.json({ data: serializeDecimals(await getBidsSummary()) });
  }),
);

bidsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const bid = await getBidDetail(req.params.id);
    if (!bid) throw new ApiError(404, 'Bid not found');
    res.json({ data: serializeDecimals(bid) });
  }),
);

bidsRouter.post(
  '/',
  validateBody(bidCoreSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as BidCoreInput;
    try {
      const bid = await prisma.bid.create({
        data: {
          ...coreData(input),
          stages: { create: DEFAULT_STAGE_LABELS.map((label, i) => ({ label, sortOrder: i })) },
        },
      });
      res.status(201).json({ data: serializeDecimals(await getBidDetail(bid.id)) });
    } catch (err) {
      throw linkError(err);
    }
  }),
);

bidsRouter.put(
  '/:id',
  validateBody(bidCoreSchema),
  asyncHandler(async (req, res) => {
    await ensureBid(req.params.id);
    const input = req.body as BidCoreInput;
    try {
      await prisma.bid.update({ where: { id: req.params.id }, data: coreData(input) });
    } catch (err) {
      throw linkError(err);
    }
    res.json({ data: serializeDecimals(await getBidDetail(req.params.id)) });
  }),
);

bidsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await ensureBid(req.params.id);
    try {
      await prisma.bid.delete({ where: { id: req.params.id } });
    } catch (err) {
      assertDeletable(err, 'Cannot delete this bid.');
    }
    res.json({ data: { ok: true } });
  }),
);

// ---- Child collections (replace-all) --------------------------------------

bidsRouter.put(
  '/:id/stages',
  validateBody(stagesReplaceSchema),
  asyncHandler(async (req, res) => {
    await ensureBid(req.params.id);
    const { items } = req.body as { items: Array<{ label: string; dueDate?: string | null; status: string; notes?: string | null }> };
    await prisma.$transaction([
      prisma.bidStage.deleteMany({ where: { bidId: req.params.id } }),
      prisma.bidStage.createMany({
        data: items.map((it, i) => ({
          bidId: req.params.id,
          label: it.label,
          dueDate: toDate(it.dueDate),
          status: it.status as 'pending' | 'done' | 'skipped',
          notes: it.notes ?? null,
          sortOrder: i,
        })),
      }),
    ]);
    res.json({ data: serializeDecimals(await getBidDetail(req.params.id)) });
  }),
);

bidsRouter.put(
  '/:id/thresholds',
  validateBody(thresholdsReplaceSchema),
  asyncHandler(async (req, res) => {
    await ensureBid(req.params.id);
    const { items } = req.body as { items: Array<{ label: string; met: boolean; notes?: string | null }> };
    await prisma.$transaction([
      prisma.bidThreshold.deleteMany({ where: { bidId: req.params.id } }),
      prisma.bidThreshold.createMany({
        data: items.map((it, i) => ({ bidId: req.params.id, label: it.label, met: it.met, notes: it.notes ?? null, sortOrder: i })),
      }),
    ]);
    res.json({ data: serializeDecimals(await getBidDetail(req.params.id)) });
  }),
);

bidsRouter.put(
  '/:id/scoring',
  validateBody(scoringReplaceSchema),
  asyncHandler(async (req, res) => {
    await ensureBid(req.params.id);
    const { items } = req.body as {
      items: Array<{ label: string; weight: number; ourScore?: number | null; notes?: string | null }>;
    };
    await prisma.$transaction([
      prisma.bidScoringCriterion.deleteMany({ where: { bidId: req.params.id } }),
      prisma.bidScoringCriterion.createMany({
        data: items.map((it, i) => ({
          bidId: req.params.id,
          label: it.label,
          weight: it.weight,
          ourScore: it.ourScore ?? null,
          notes: it.notes ?? null,
          sortOrder: i,
        })),
      }),
    ]);
    res.json({ data: serializeDecimals(await getBidDetail(req.params.id)) });
  }),
);

bidsRouter.put(
  '/:id/payments',
  validateBody(paymentsReplaceSchema),
  asyncHandler(async (req, res) => {
    await ensureBid(req.params.id);
    const { items } = req.body as {
      items: Array<{
        label: string;
        amount: number;
        dueDate?: string | null;
        paid: boolean;
        paidDate?: string | null;
        poNumber?: string | null;
        notes?: string | null;
      }>;
    };
    await prisma.$transaction([
      prisma.bidPayment.deleteMany({ where: { bidId: req.params.id } }),
      prisma.bidPayment.createMany({
        data: items.map((it, i) => ({
          bidId: req.params.id,
          label: it.label,
          amount: it.amount,
          dueDate: toDate(it.dueDate),
          paid: it.paid,
          paidDate: toDate(it.paidDate),
          poNumber: it.poNumber ?? null,
          notes: it.notes ?? null,
          sortOrder: i,
        })),
      }),
    ]);
    res.json({ data: serializeDecimals(await getBidDetail(req.params.id)) });
  }),
);

// A unique-constraint violation here means the chosen project is already
// linked to another bid.
function linkError(err: unknown): unknown {
  if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2002') {
    return new ApiError(409, 'That project is already linked to another bid.');
  }
  return err;
}
