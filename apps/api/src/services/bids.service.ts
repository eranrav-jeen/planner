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

// Upcoming-dates window for the dashboard timeline.
const TIMELINE_DAYS = 60;
const TIMELINE_MAX_ITEMS = 24;

// Today's calendar date in Israel (stage dates are plain calendar dates).
function todayIsoIL(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function getBidsSummary() {
  const bids = await prisma.bid.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      title: true,
      status: true,
      winProbability: true,
      estimatedValue: true,
      stages: {
        where: { status: 'pending', dueDate: { not: null } },
        select: { id: true, label: true, dueDate: true, notes: true },
      },
      payments: { select: { amount: true, sentForPayment: true, paid: true } },
    },
  });

  const todayIso = todayIsoIL();
  const horizon = new Date(`${todayIso}T00:00:00.000Z`);
  horizon.setUTCDate(horizon.getUTCDate() + TIMELINE_DAYS);
  const horizonIso = horizon.toISOString().slice(0, 10);

  const byStatus: Record<string, number> = {};
  let pipelineValue = 0;
  let weightedValue = 0;
  let wonValue = 0;
  let paymentsTotal = 0;
  let paymentsSent = 0;
  let paymentsPaid = 0;
  const timeline: Array<{
    stageId: string;
    bidId: string;
    bidTitle: string;
    bidStatus: string;
    label: string;
    date: string;
    notes: string | null;
  }> = [];
  const wonBids: Array<{ id: string; title: string; total: number; sent: number; paid: number }> = [];

  for (const b of bids) {
    byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
    const value = Number(b.estimatedValue ?? 0);

    if ((ACTIVE_STATUSES as readonly string[]).includes(b.status)) {
      pipelineValue += value;
      weightedValue += value * ((b.winProbability ?? 0) / 100);
      for (const st of b.stages) {
        const date = st.dueDate!.toISOString().slice(0, 10);
        if (date >= todayIso && date <= horizonIso) {
          timeline.push({ stageId: st.id, bidId: b.id, bidTitle: b.title, bidStatus: b.status, label: st.label, date, notes: st.notes });
        }
      }
    }

    if (b.status === 'won') {
      wonValue += value;
      let total = 0;
      let sent = 0;
      let paid = 0;
      for (const p of b.payments) {
        const amt = Number(p.amount);
        total += amt;
        if (p.paid) paid += amt;
        // "Sent" counts everything invoiced, including what has since been paid.
        if (p.sentForPayment || p.paid) sent += amt;
      }
      paymentsTotal += total;
      paymentsSent += sent;
      paymentsPaid += paid;
      wonBids.push({ id: b.id, title: b.title, total: round2(total), sent: round2(sent), paid: round2(paid) });
    }
  }

  timeline.sort((a, b) => a.date.localeCompare(b.date) || a.bidTitle.localeCompare(b.bidTitle));

  return {
    total: bids.length,
    byStatus,
    today: todayIso,
    pipelineValue: round2(pipelineValue),
    weightedValue: round2(weightedValue),
    wonValue: round2(wonValue),
    paymentsTotal: round2(paymentsTotal),
    paymentsSent: round2(paymentsSent),
    paymentsPaid: round2(paymentsPaid),
    // Sent for payment but not yet paid.
    paymentsAwaiting: round2(paymentsSent - paymentsPaid),
    paymentsOutstanding: round2(paymentsTotal - paymentsPaid),
    timeline: timeline.slice(0, TIMELINE_MAX_ITEMS),
    wonBids,
  };
}
