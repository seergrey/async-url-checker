import { List, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useJobsStore } from '../store/jobsStore';
import { StatusBadge } from './StatusBadge';
import type { JobSummary } from '../api/types';

const { Text } = Typography;

/** Список заданий с краткой информацией. Клик выбирает активное задание. */
export function JobList() {
  const jobs = useJobsStore((s) => s.jobs);
  const jobsLoading = useJobsStore((s) => s.jobsLoading);
  const activeJobId = useJobsStore((s) => s.activeJobId);
  const selectJob = useJobsStore((s) => s.selectJob);

  return (
    <List
      size="small"
      loading={jobsLoading}
      header={<Text strong>Задания</Text>}
      bordered
      dataSource={jobs}
      locale={{ emptyText: 'Пока нет заданий' }}
      renderItem={(job: JobSummary) => {
        const isActive = job.id === activeJobId;
        return (
          <List.Item
            onClick={() => selectJob(job.id)}
            style={{
              cursor: 'pointer',
              background: isActive ? '#e6f4ff' : undefined,
              paddingInline: 12,
            }}
          >
            <div style={{ width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <StatusBadge status={job.status} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(job.createdAt).format('DD.MM.YYYY HH:mm:ss')}
                </Text>
              </div>
              <div style={{ marginTop: 6 }}>
                <Tag color="green">✓ {job.success}</Tag>
                <Tag color="red">✗ {job.error}</Tag>
                {job.cancelled > 0 && (
                  <Tag color="orange">⊘ {job.cancelled}</Tag>
                )}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  из {job.total}
                </Text>
              </div>
              <Text
                code
                style={{ fontSize: 11, display: 'block', marginTop: 4 }}
              >
                {job.id}
              </Text>
            </div>
          </List.Item>
        );
      }}
    />
  );
}
