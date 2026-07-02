import { useEffect, useState } from 'react';

/**
 * Возвращает текущий timestamp (мс), обновляющийся раз в `intervalMs`.
 * Используется, чтобы отображать «живое» время обработки URL в статусе
 * in_progress (тикание таймера).
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // intervalMs <= 0 — таймер не запускается (нет in_progress URL).
    if (intervalMs <= 0) return;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
