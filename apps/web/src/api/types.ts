export type CustomerStatus = 'active' | 'prospect' | 'inactive';
export type EmploymentType = 'full_time' | 'part_time' | 'contractor';
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type BillingType = 'fixed_price' | 'time_and_materials';

export interface Customer {
  id: string;
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  status: CustomerStatus;
  notes?: string | null;
  hasLicense: boolean;
  licenseAnnualAmount?: number | null;
  licensePeriodStart?: string | null;
  licensePeriodEnd?: string | null;
  licensePaid: boolean;
  licensePlatformVersion?: string | null;
  licenseModelsInstalled: string[];
  createdAt: string;
  updatedAt: string;
  projects?: Project[];
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title?: string | null;
  department?: string | null;
  employmentType: EmploymentType;
  monthlyCapacityHours: number;
  costRateHourly?: number | null;
  isActive: boolean;
  startDate?: string | null;
  assignments?: (ProjectAssignment & { project: Project })[];
}

export interface Project {
  id: string;
  customerId: string;
  customer?: Customer;
  name: string;
  code: string;
  status: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
  incomeAmount: number;
  hoursPaid: number;
  currency: string;
  billingType: BillingType;
  description?: string | null;
  poFileName?: string | null;
  poMimeType?: string | null;
  poFileSize?: number | null;
  poUploadedAt?: string | null;
  assignments?: (ProjectAssignment & { employee: Employee })[];
  burn?: { hoursPaid: number; consumed: number; remaining: number };
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  employeeId: string;
  roleOnProject?: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
