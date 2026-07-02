import { useEffect, useState } from 'react';
import { useJobsStore } from '../store/jobsStore';

/** Интервал авто-обновления списка заданий, мс.
 *  Намного длиннее интервала поллинга активного задания (2.5с) — список не так
 *  критичен, активное задание и так обновляется чаще. */
const AUTO_REFRESH_INTERVAL_MS = 60_000;

/** Тикер для отображения «обновлено N сек назад» — обновляется раз в секунду. */
const TICK_INTERVAL_MS = 1000;

/**
 * Авто-обновление списка заданий, пока в нём есть незавершённые
 * (pending/in_progress). Когда все терминальные — останавливается.
 *
 * Возвращает secondsAgo: сколько секунд назад список обновлялся в последний раз
 * (null, если ещё ни разу). Используется для индикатора.
 */
export function useJobsAutoRefresh(): number | null {
  const jobs = useJobsStore((s) => s.jobs);
  const fetchJobs = useJobsStore((s) => s.fetchJobs);
  const jobsUpdatedAt = useJobsStore((s) => s.jobsUpdatedAt);

  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  // Есть ли незавершённые задания?
  const hasActive = jobs.some(
    (j) => j.status === 'pending' || j.status === 'in_progress',
  );

  // Авто-обновление списка, пока есть незавершённые задания.
  useEffect(() => {
    if (!hasActive) return;
    const id = window.setInterval(() => {
      void fetchJobs();
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [hasActive, fetchJobs]);

  // Тикер «обновлено N сек назад».
  useEffect(() => {
    const update = () =>
      setSecondsAgo(jobsUpdatedAt ? Math.floor((Date.now() - jobsUpdatedAt) / 1000) : null);
    update();
    const id = window.setInterval(update, TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [jobsUpdatedAt]);

  return secondsAgo;
}
