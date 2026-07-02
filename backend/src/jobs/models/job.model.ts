/**
 * Доменные типы задания проверки URL.
 */

/** Статус задания в целом. */
export type JobStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'failed';

/** Статус отдельного URL в рамках задания. */
export type UrlStatus =
  | 'pending'
  | 'in_progress'
  | 'success'
  | 'error'
  | 'cancelled';

/** Результат проверки одного URL. */
export interface UrlResult {
  url: string;
  status: UrlStatus;
  /** HTTP-статус ответа, если он был получен. */
  httpStatus?: number;
  /** Сообщение об ошибке (сетевая ошибка / таймаут), если есть. */
  error?: string;
  /** ISO-время начала обработки. */
  startedAt?: string;
  /** ISO-время окончания обработки. */
  finishedAt?: string;
  /** Длительность обработки в миллисекундах. */
  durationMs?: number;
}

/** Задание проверки списка URL. */
export interface Job {
  id: string;
  createdAt: string;
  status: JobStatus;
  urls: UrlResult[];
}

/** Краткая информация о задании для списка. */
export interface JobSummary {
  id: string;
  createdAt: string;
  status: JobStatus;
  total: number;
  success: number;
  error: number;
  cancelled: number;
}

/** Полная информация о задании (детальный ответ API). */
export interface JobDetails extends JobSummary {
  /** Сколько URL уже обработано (имеют терминальный статус). */
  processedCount: number;
  urls: UrlResult[];
}

/** Константа терминальных статусов задания. */
export const TERMINAL_JOB_STATUSES: ReadonlySet<JobStatus> = new Set([
  'completed',
  'cancelled',
  'failed',
]);
