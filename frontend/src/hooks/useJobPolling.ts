import { useEffect, useRef } from 'react';
import { useJobsStore } from '../store/jobsStore';
import { TERMINAL_JOB_STATUSES } from '../api/types';

/** Интервал опроса активного задания, мс. */
const POLL_INTERVAL_MS = 2500;

/**
 * Хук периодического опроса активного задания.
 *
 * Пока у активного задания не терминальный статус — раз в POLL_INTERVAL_MS
 * опрашиваем GET /api/jobs/:id. При смене активного задания (или размонтировании)
 * предыдущий интервал корректно очищается.
 *
 * Ответы по старому jobId не мутируют состояние: защиту обеспечивает store
 * (сверка _pollToken / activeJobId после await), плюс здесь — флаг in-flight,
 * чтобы запросы не накладывались.
 */
export function useJobPolling(): void {
  const activeJobId = useJobsStore((s) => s.activeJobId);
  const activeJob = useJobsStore((s) => s.activeJob);
  const pollActive = useJobsStore((s) => s.pollActive);

  // Флаг, что опрос сейчас в полёте — чтобы не запускать новый, пока старый
  // не завершился (защита от наложения при медленной сети).
  const inFlightRef = useRef(false);
  // Актуальный activeJobId внутри интервала (на случай смены между тиками).
  const idRef = useRef<string | null>(activeJobId);
  idRef.current = activeJobId;

  useEffect(() => {
    if (!activeJobId) return;

    // Если статус уже терминальный — не запускаем опрос.
    if (activeJob && TERMINAL_JOB_STATUSES.has(activeJob.status)) {
      return;
    }

    const tick = async () => {
      if (inFlightRef.current) return;
      // Если активное задание сменилось после установки интервала — не опрашиваем.
      if (idRef.current !== activeJobId) return;
      inFlightRef.current = true;
      try {
        await pollActive();
      } finally {
        inFlightRef.current = false;
      }
    };

    const intervalId = window.setInterval(tick, POLL_INTERVAL_MS);

    // Cleanup: предыдущий опрос корректно останавливается.
    return () => {
      window.clearInterval(intervalId);
    };
    // Зависим от activeJobId и статуса (чтобы перезапуститься/остановиться).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJobId, activeJob?.status]);
}
