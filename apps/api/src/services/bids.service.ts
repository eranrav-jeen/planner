import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

// Steps a new bid starts with; dates are filled in per bid and steps can be
// added/removed. Hebrew labels since the tenders are Hebrew; fully editable.
export const DEFAULT_STAGE_LABELS = [
  'כנס ספקים',
  'שאלות הבהרה',
  'מענה לשאלות',
  'הגשה',
  'מבחן יכולת / POC',
  'ראיון',
  'פרסום זוכים',
];

const ACTIVE_STATUSES = ['evaluating', 'applying', 'submitted'] as const;

export const toDate = (s?: string | null): Date | null => (s ? new Date(`${s}T00:00:00.000Z`) : null);

const bidDetailInclude = {
  stages: { orderBy: { sortOrder: 'asc' } },
  thresholds: { orderBy: { sortOrder: 'asc' } },
  scoringCriteria: { orderBy: { sortOrder: 'asc' } },
  payments: { orderBy: { sortOrder: 'asc' } },
  project: { select: { id: true, name: true, code: true } },
} satisfies Prisma.BidInclude;

export function getBidDetail(id: string) {
  return prisma.bid.findUnique({ where: { id }, include: bidDetailInclude });
}

export async function getBidsList() {
  const bids = await prisma.bid.findMany({
    orderBy: [{ submissionDate: 'asc' }, { createdAt: 'desc' }],
    include: {
      stages: { select: { label: true, dueDate: true, status: true }, orderBy: { sortOrder: 'asc' } },
      payments: { select: { amount: true, paid: true } },
      project: { select: { id: true, name: true, code: true } },
    },
  });

  return bids.map((b) => {
    const stagesTotal = b.stages.length;
    const stagesDone = b.stages.filter((s) => s.status === 'done').length;
    const nextStage = b.stages.find((s) => s.status === 'pending' && s.dueDate) ?? b.stages.find((s) => s.status === 'pending');
    const totalPayments = b.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const paidPayments = b.payments.filter((p) => p.paid).reduce((sum, p) => sum + Number(p.amount), 0);
    return {
      id: b.id,
      title: b.title,
      issuer: b.issuer,
      status: b.status,
      submissionDate: b.submissionDate,
      winProbability: b.winProbability,
      estimatedValue: b.estimatedValue,
      stagesDone,
      stagesTotal,
      nextStageLabel: nextStage?.label ?? null,
      nextStageDate: nextStage?.dueDate ?? null,
      totalPayments,
      paidPayments,
      project: b.project,
    };
  });
}

export async function getBidsSummary() {
  const bids = await prisma.bid.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      submissionDate: true,
      winProbability: true,
      estimatedValue: true,
      payments: { select: { amount: true, paid: true, dueDate: true } },
    },
  });

  const byStatus: Record<string, number> = {};
  let pipelineValue = 0;
  let weightedValue = 0;
  let wonValue = 0;
  let paymentsTotal = 0;
  let paymentsPaid = 0;
  let overduePayments = 0;

  const todayIso = new Date().toISOString().slice(0, 10);

  for (const b of bids) {
    byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
    const value = Number(b.estimatedValue ?? 0);
    if ((ACTIVE_STATUSES as readonly string[]).includes(b.status)) {
      pipelineValue += value;
      weightedValue += value * ((b.winProbability ?? 0) / 100);
    }
    if (b.status === 'won') {
      wonValue += value;
      for (const p of b.payments) {
        const amt = Number(p.amount);
        paymentsTotal += amt;
        if (p.paid) paymentsPaid += amt;
        else if (p.dueDate && p.dueDate.toISOString().slice(0, 10) < todayIso) overduePayments += 1;
      }
    }
  }

  const upcoming = bids
    .filter(
      (b) =>
        (ACTIVE_STATUSES as readonly string[]).includes(b.status) &&
        b.submissionDate &&
        b.submissionDate.toISOString().slice(0, 10) >= todayIso,
    )
    .sort((a, b) => a.submissionDate!.getTime() - b.submissionDate!.getTime())
    .slice(0, 6)
    .map((b) => ({ id: b.id, title: b.title, submissionDate: b.submissionDate, status: b.status }));

  return {
    total: bids.length,
    byStatus,
    pipelineValue: Math.round(pipelineValue * 100) / 100,
    weightedValue: Math.round(weightedValue * 100) / 100,
    wonValue: Math.round(wonValue * 100) / 100,
    paymentsTotal: Math.round(paymentsTotal * 100) / 100,
    paymentsPaid: Math.round(paymentsPaid * 100) / 100,
    paymentsOutstanding: Math.round((paymentsTotal - paymentsPaid) * 100) / 100,
    overduePayments,
    upcoming,
  };
}
