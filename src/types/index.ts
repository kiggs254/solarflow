import type {
  User,
  Lead,
  Project,
  Proposal,
  Task,
  Role,
  LeadPipelineStage,
  ProjectStatusOption,
  ProposalStatusOption,
  LeadCaptureForm,
} from "@prisma/client";

export type {
  User,
  Lead,
  Project,
  Proposal,
  Task,
  Role,
  LeadPipelineStage,
  ProjectStatusOption,
  ProposalStatusOption,
  LeadCaptureForm,
};

export type SafeUser = Omit<User, "passwordHash">;

export interface LeadWithRelations extends Lead {
  pipelineStage?: LeadPipelineStage | null;
  assignedTo?: SafeUser | null;
  sourceForm?: Pick<LeadCaptureForm, "id" | "name" | "slug"> & { fields?: unknown } | null;
  project?: Project | null;
  proposals?: Proposal[];
}

export interface ProjectWithRelations extends Project {
  projectStatus?: ProjectStatusOption | null;
  lead: Lead;
  tasks: Task[];
  proposals: Proposal[];
}

export interface ProposalWithRelations extends Proposal {
  proposalStatus?: ProposalStatusOption | null;
  lead: Lead;
  project?: Project | null;
}

export interface TaskWithRelations extends Task {
  project?: Project | null;
  assignedTo?: SafeUser | null;
}

export interface PipelineChartRow {
  id: string;
  key: string;
  label: string;
  count: number;
}

export interface DashboardStats {
  totalLeads: number;
  conversionRate: number;
  revenue: number;
  activeInstallations: number;
  /** Counts keyed by pipeline stage `key` (slug) */
  leadsByStage: Record<string, number>;
  pipelineChartRows?: PipelineChartRow[];
  recentLeads: Lead[];
  monthlyRevenue: { month: string; revenue: number }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type { ProposalPresentationData } from "@/lib/public-proposal-dto";
