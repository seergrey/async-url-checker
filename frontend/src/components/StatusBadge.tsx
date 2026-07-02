import { Tag } from 'antd';
import type { JobStatus, UrlStatus } from '../api/types';

type AnyStatus = JobStatus | UrlStatus;

const STATUS_CONFIG: Record<AnyStatus, { color: string; label: string }> = {
  // Общие
  pending: { color: 'default', label: 'Ожидает' },
  in_progress: { color: 'processing', label: 'В работе' },
  cancelled: { color: 'orange', label: 'Отменён' },
  // URL
  success: { color: 'green', label: 'Успех' },
  error: { color: 'red', label: 'Ошибка' },
  // Job
  completed: { color: 'blue', label: 'Завершён' },
  failed: { color: 'magenta', label: 'Сбой' },
};

/** Бейдж статуса задания/URL с единым цветовым кодированием. */
export function StatusBadge({ status }: { status: AnyStatus }) {
  const cfg = STATUS_CONFIG[status];
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}
