import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export type BidStatus = 'evaluating' | 'applying' | 'submitted' | 'won' | 'lost' | 'no_bid';
export type BidStageStatus = 'pending' | 'done' | 'skipped';

export interface BidStage {
  id: string;
  label: string;
  dueDate: string | null;
  status: BidStageStatus;
  notes: string | null;
  sortOrder: number;
}
export interface BidThreshold {
  id: string;
  label: string;
  met: boolean;
  notes: string | null;
  sortOrder: number;
}
export interface BidScoringCriterion {
  id: string;
  label: string;
  weight: number;
  ourScore: number | null;
  notes: string | null;
  sortOrder: number;
}
export interface BidPayment {
  id: string;
  label: string;
  amount: number;
  sentForPayment: boolean;
  paid: boolean;
  poNumber: string | null;
  notes: string | null;
  sortOrder: number;
}
export interface BidProjectRef {
  id: string;
  name: string;
  code: string;
}

export interface BidListRow {
  id: string;
  title: string;
  issuer: string | null;
  status: BidStatus;
  submissionDate: string | null;
  winProbability: number | null;
  estimatedValue: number | null;
  stagesDone: number;
  stagesTotal: number;
  nextStageLabel: string | null;
  nextStageDate: string | null;
  totalPayments: number;
  paidPayments: number;
  project: BidProjectRef | null;
}

export interface Bid {
  id: string;
  title: string;
  issuer: string | null;
  description: string | null;
  status: BidStatus;
  submissionDate: string | null;
  winProbability: number | null;
  estimatedValue: number | null;
  budgetNote: string | null;
  competitors: string | null;
  partners: string | null;
  notes: string | null;
  projectId: string | null;
  project: BidProjectRef | null;
  stages: BidStage[];
  thresholds: BidThreshold[];
  scoringCriteria: BidScoringCriterion[];
  payments: BidPayment[];
}

export interface BidSummary {
  total: number;
  byStatus: Partial<Record<BidStatus, number>>;
  pipelineValue: number;
  weightedValue: number;
  today: string;
  wonValue: number;
  paymentsTotal: number;
  paymentsSent: number;
  paymentsPaid: number;
  paymentsAwaiting: number;
  paymentsOutstanding: number;
  timeline: BidTimelineItem[];
  wonBids: WonBidPayments[];
}

// A pending, dated stage of an active bid, for the dashboard timeline.
export interface BidTimelineItem {
  stageId: string;
  bidId: string;
  bidTitle: string;
  bidStatus: BidStatus;
  label: string;
  date: string;
  notes: string | null;
}

// Payment progress of one won bid. `sent` includes amounts already paid.
export interface WonBidPayments {
  id: string;
  title: string;
  total: number;
  sent: number;
  paid: number;
}

export interface BidCoreInput {
  title: string;
  issuer?: string | null;
  description?: string | null;
  status: BidStatus;
  submissionDate?: string | null;
  winProbability?: number | null;
  estimatedValue?: number | null;
  budgetNote?: string | null;
  competitors?: string | null;
  partners?: string | null;
  notes?: string | null;
  projectId?: string | null;
}

export type StageInput = Pick<BidStage, 'label' | 'dueDate' | 'status' | 'notes'>;
export type ThresholdInput = Pick<BidThreshold, 'label' | 'met' | 'notes'>;
export type ScoringInput = Pick<BidScoringCriterion, 'label' | 'weight' | 'ourScore' | 'notes'>;
export type PaymentInput = Pick<BidPayment, 'label' | 'amount' | 'sentForPayment' | 'paid' | 'poNumber' | 'notes'>;

export function useBids() {
  return useQuery({ queryKey: ['bids'], queryFn: () => api.get<BidListRow[]>('/bids') });
}
export function useBidsSummary() {
  return useQuery({ queryKey: ['bids', 'summary'], queryFn: () => api.get<BidSummary>('/bids/summary') });
}
export function useBid(id: string | undefined) {
  return useQuery({ queryKey: ['bids', id], queryFn: () => api.get<Bid>(`/bids/${id}`), enabled: !!id });
}

function useInvalidateBids(id?: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['bids'] });
    if (id) qc.invalidateQueries({ queryKey: ['bids', id] });
  };
}

export function useCreateBid() {
  const invalidate = useInvalidateBids();
  return useMutation({ mutationFn: (input: BidCoreInput) => api.post<Bid>('/bids', input), onSuccess: invalidate });
}
export function useUpdateBid(id: string) {
  const invalidate = useInvalidateBids(id);
  return useMutation({ mutationFn: (input: BidCoreInput) => api.put<Bid>(`/bids/${id}`, input), onSuccess: invalidate });
}
export function useDeleteBid() {
  const invalidate = useInvalidateBids();
  return useMutation({ mutationFn: (id: string) => api.delete<{ ok: true }>(`/bids/${id}`), onSuccess: invalidate });
}

function makeReplaceHook<T>(path: string) {
  return (id: string) => {
    const invalidate = useInvalidateBids(id);
    return useMutation({
      mutationFn: (items: T[]) => api.put<Bid>(`/bids/${id}/${path}`, { items }),
      onSuccess: invalidate,
    });
  };
}
export const useReplaceStages = makeReplaceHook<StageInput>('stages');
export const useReplaceThresholds = makeReplaceHook<ThresholdInput>('thresholds');
export const useReplaceScoring = makeReplaceHook<ScoringInput>('scoring');
export const useReplacePayments = makeReplaceHook<PaymentInput>('payments');
