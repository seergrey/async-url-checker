import { Injectable } from '@nestjs/common';
import { Job, JobDetails, JobSummary, UrlResult } from './models/job.model';

/**
 * In-memory хранилище заданий.
 *
 * Хранит задания в Map и дополнительно хранит AbortController для каждого
 * задания, чтобы можно было прервать задержки и ожидающие запросы при отмене.
 *
 * БД не используется — данные живут только в процессе (по ТЗ).
 */
@Injectable()
export class JobsStore {
  private readonly jobs = new Map<string, Job>();
  /** AbortController для отмены задания по id. */
  private readonly cancelControllers = new Map<string, AbortController>();

  create(urls: string[]): { job: Job; cancelController: AbortController } {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const job: Job = {
      id,
      createdAt: now,
      status: 'pending',
      urls: urls.map<UrlResult>((url) => ({
        url,
        status: 'pending',
      })),
    };
    const cancelController = new AbortController();
    this.jobs.set(id, job);
    this.cancelControllers.set(id, cancelController);
    return { job, cancelController };
  }

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  getCancelController(id: string): AbortController | undefined {
    return this.cancelControllers.get(id);
  }

  /** Все задания, отсортированные по убыванию даты создания. */
  getAll(): Job[] {
    return Array.from(this.jobs.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  /** Превратить задание в краткую сводку для списка. */
  toSummary(job: Job): JobSummary {
    const stats = this.computeStats(job);
    return {
      id: job.id,
      createdAt: job.createdAt,
      status: job.status,
      ...stats,
    };
  }

  /** Превратить задание в детальный ответ. */
  toDetails(job: Job): JobDetails {
    const stats = this.computeStats(job);
    const processedCount =
      stats.success + stats.error + stats.cancelled;
    return {
      id: job.id,
      createdAt: job.createdAt,
      status: job.status,
      processedCount,
      urls: job.urls,
      ...stats,
    };
  }

  private computeStats(job: Job): {
    total: number;
    success: number;
    error: number;
    cancelled: number;
  } {
    let success = 0;
    let error = 0;
    let cancelled = 0;
    for (const u of job.urls) {
      if (u.status === 'success') success++;
      else if (u.status === 'error') error++;
      else if (u.status === 'cancelled') cancelled++;
    }
    return { total: job.urls.length, success, error, cancelled };
  }
}
