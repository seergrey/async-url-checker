import { http } from './http';
import type {
  CreateJobResponse,
  JobDetails,
  JobSummary,
} from './types';

/**
 * Слой работы с API заданий. Только типизированные вызовы, без состояния —
 * состоянием управляет Zustand store.
 */
export const jobsApi = {
  /** Создать задание и запустить фоновую проверку. */
  createJob(urls: string[]): Promise<CreateJobResponse> {
    return http.post<CreateJobResponse>('/jobs', { urls });
  },

  /** Список заданий (краткая информация). */
  fetchJobs(): Promise<JobSummary[]> {
    return http.get<JobSummary[]>('/jobs');
  },

  /** Детальная информация по заданию. */
  fetchJob(id: string): Promise<JobDetails> {
    return http.get<JobDetails>(`/jobs/${id}`);
  },

  /** Отменить задание. */
  cancelJob(id: string): Promise<{ id: string; status: string }> {
    return http.delete<{ id: string; status: string }>(`/jobs/${id}`);
  },
};
