import { create } from 'zustand';
import { jobsApi } from '../api/jobsApi';
import type { JobDetails, JobSummary } from '../api/types';

interface JobsState {
  // --- Список заданий ---
  jobs: JobSummary[];
  jobsLoading: boolean;

  // --- Активное задание (детали) ---
  activeJobId: string | null;
  activeJob: JobDetails | null;
  activeLoading: boolean;

  // --- Общее ---
  error: string | null;
  submitting: boolean;

  // Внутренний токен поллинга: инкрементируется при каждой смене активного
  // задания. pollActive после await сверяется с ним и игнорирует устаревшие
  // ответы — это реализует требование «ответы по старому jobId не меняют
  // состояние интерфейса».
  _pollToken: number;

  // --- Actions ---
  fetchJobs: () => Promise<void>;
  createJob: (urls: string[]) => Promise<void>;
  selectJob: (id: string) => Promise<void>;
  pollActive: () => Promise<void>;
  cancelActive: () => Promise<void>;
  clearError: () => void;
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  jobsLoading: false,
  activeJobId: null,
  activeJob: null,
  activeLoading: false,
  error: null,
  submitting: false,
  _pollToken: 0,

  clearError: () => set({ error: null }),

  fetchJobs: async () => {
    set({ jobsLoading: true, error: null });
    try {
      const jobs = await jobsApi.fetchJobs();
      // Защита: если за время запроса что-то изменилось — просто сохраняем.
      set({ jobs });
    } catch (e) {
      set({ error: errorMessage(e) });
    } finally {
      set({ jobsLoading: false });
    }
  },

  createJob: async (urls: string[]) => {
    set({ submitting: true, error: null });
    try {
      const { jobId } = await jobsApi.createJob(urls);
      // Новое задание становится активным. Инкрементируем токен, чтобы
      // устаревшие ответы предыдущего активного задания игнорировались.
      set((s) => ({
        activeJobId: jobId,
        activeJob: null,
        activeLoading: true,
        _pollToken: s._pollToken + 1,
      }));
      // Подгружаем детали и обновляем список.
      await get().pollActive();
      void get().fetchJobs();
    } catch (e) {
      set({ error: errorMessage(e) });
    } finally {
      set({ submitting: false });
    }
  },

  selectJob: async (id: string) => {
    // Смена активного задания — инкрементируем токен поллинга.
    set((s) => ({
      activeJobId: id,
      activeJob: null,
      activeLoading: true,
      error: null,
      _pollToken: s._pollToken + 1,
    }));
    await get().pollActive();
  },

  pollActive: async () => {
    const { activeJobId, _pollToken } = get();
    if (!activeJobId) return;

    try {
      const details = await jobsApi.fetchJob(activeJobId);
      // КРИТИЧНО: после await проверяем, что ответ всё ещё актуален.
      // Если за это время сменили активное задание — игнорируем ответ.
      const current = get();
      if (
        current.activeJobId !== activeJobId ||
        current._pollToken !== _pollToken
      ) {
        return;
      }
      set({ activeJob: details, activeLoading: false });
    } catch (e) {
      // При ошибке опроса не сбрасываем activeJobId — просто показываем ошибку.
      const current = get();
      if (
        current.activeJobId !== activeJobId ||
        current._pollToken !== _pollToken
      ) {
        return;
      }
      set({ error: errorMessage(e), activeLoading: false });
    }
  },

  cancelActive: async () => {
    const { activeJobId } = get();
    if (!activeJobId) return;
    try {
      await jobsApi.cancelJob(activeJobId);
      // Сразу обновляем детали и список.
      await get().pollActive();
      void get().fetchJobs();
    } catch (e) {
      set({ error: errorMessage(e) });
    }
  },
}));

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
