/**
 * Типы, зеркальные бэкенду (см. backend/src/jobs/models/job.model.ts).
 */

export type JobStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type UrlStatus =
  | 'pending'
  | 'in_progress'
  | 'success'
  | 'error'
  | 'cancelled';

export interface UrlResult {
  url: string;
  status: UrlStatus;
  httpStatus?: number;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
}

export interface JobSummary {
  id: string;
  createdAt: string;
  status: JobStatus;
  total: number;
  success: number;
  error: number;
  cancelled: number;
}

export interface JobDetails extends JobSummary {
  processedCount: number;
  urls: UrlResult[];
}

export interface CreateJobResponse {
  jobId: string;
}

/** Терминальные статусы задания — поллинг останавливается. */
export const TERMINAL_JOB_STATUSES: ReadonlySet<JobStatus> = new Set([
  'completed',
  'cancelled',
  'failed',
]);
