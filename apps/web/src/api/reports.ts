import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface UtilizationRow {
  employeeId: string;
  employeeName: string;
  month: string;
  plannedHours: number;
  actualHours: number | null;
  capacityHours: number;
  utilization: number;
}

export interface UtilizationReport {
  rows: UtilizationRow[];
  totalsByMonth: { month: string; plannedHours: number; capacityHours: number; utilization: number }[];
}

export function useUtilizationReport(from: string, to: string, filters: { employeeId?: string } = {}) {
  const params = new URLSearchParams({ from, to });
  if (filters.employeeId) params.set('employeeId', filters.employeeId);
  return useQuery({
    queryKey: ['reports', 'utilization', from, to, filters],
    queryFn: () => api.get<UtilizationReport>(`/reports/utilization?${params.toString()}`),
  });
}

export interface DemandCapacityReport {
  rows: { month: string; demand: number; capacity: number; gap: number }[];
}

export function useDemandCapacityReport(from: string, to: string) {
  return useQuery({
    queryKey: ['reports', 'demand-capacity', from, to],
    queryFn: () => api.get<DemandCapacityReport>(`/reports/demand-capacity?from=${from}&to=${to}`),
  });
}

export interface ProjectBurnRow {
  projectId: string;
  projectName: string;
  projectCode: string;
  customerName: string;
  status: string;
  endDate: string | null;
  hoursPaid: number;
  consumed: number;
  remaining: number;
  percentConsumed: number;
}

export function useProjectBurnReport(filters: { customerId?: string; status?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.customerId) params.set('customerId', filters.customerId);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return useQuery({
    queryKey: ['reports', 'project-burn', filters],
    queryFn: () => api.get<{ rows: ProjectBurnRow[] }>(`/reports/project-burn${qs ? `?${qs}` : ''}`),
  });
}

export interface ProfitabilityRow {
  projectId: string;
  projectName: string;
  projectCode: string;
  customerName: string;
  status: string;
  income: number;
  cost: number;
  margin: number;
  marginPercent: number;
}

export function useProfitabilityReport(filters: { customerId?: string; status?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.customerId) params.set('customerId', filters.customerId);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return useQuery({
    queryKey: ['reports', 'profitability', filters],
    queryFn: () => api.get<{ rows: ProfitabilityRow[] }>(`/reports/profitability${qs ? `?${qs}` : ''}`),
  });
}

export interface PortfolioRow {
  customerId: string;
  customerName: string;
  status: string;
  projectCount: number;
  activeProjectCount: number;
  totalIncome: number;
  totalHoursPaid: number;
}

export function usePortfolioReport() {
  return useQuery({
    queryKey: ['reports', 'portfolio'],
    queryFn: () => api.get<{ rows: PortfolioRow[] }>('/reports/portfolio'),
  });
}

export interface ForecastReport {
  months: string[];
  totalsByMonth: { month: string; revenue: number }[];
  byProject: {
    projectId: string;
    projectName: string;
    projectCode: string;
    billingType: string;
    method: string;
    monthlyRevenue: Record<string, number>;
    total: number;
  }[];
}

export function useForecastReport(from: string, to: string) {
  return useQuery({
    queryKey: ['reports', 'forecast', from, to],
    queryFn: () => api.get<ForecastReport>(`/reports/forecast?from=${from}&to=${to}`),
  });
}

export interface DashboardSummary {
  activeProjectCount: number;
  totalIncome: number;
  activeLicenseRevenue: number;
  totalContractedIncome: number;
  totalHoursPaid: number;
  totalHoursConsumed: number;
  atRiskProjects: { projectId: string; projectName: string; projectCode: string; reason: string }[];
  licensedCustomerCount: number;
  totalLicenseRevenue: number;
  licenseAttention: { customerId: string; customerName: string; reason: string }[];
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => api.get<DashboardSummary>('/reports/summary'),
  });
}
