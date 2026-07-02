import { useState } from 'react';
import { Button, Popconfirm, Progress, Space, Spin, Typography } from 'antd';
import { useJobsStore } from '../store/jobsStore';
import { StatusBadge } from './StatusBadge';
import { TERMINAL_JOB_STATUSES } from '../api/types';
import type { ColumnsType } from 'antd/es/table';
import { Table } from 'antd';
import type { UrlResult } from '../api/types';
import { useNow } from '../hooks/useNow';

const { Title, Text } = Typography;

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} мс`;
  return `${(ms / 1000).toFixed(2)} с`;
}

/** Колонки таблицы URL. `now` — живое время для in_progress URL. */
function useColumns(now: number): ColumnsType<UrlResult> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return [
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      render: (url: string) => (
        <Text copyable={{ text: url }} style={{ fontSize: 13 }}>
          {url}
        </Text>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: UrlResult['status']) => <StatusBadge status={status} />,
    },
    {
      title: 'HTTP',
      dataIndex: 'httpStatus',
      key: 'httpStatus',
      width: 80,
      render: (code?: number) =>
        code !== undefined ? <Text code>{code}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Ошибка',
      dataIndex: 'error',
      key: 'error',
      ellipsis: true,
      render: (err?: string) =>
        err ? <Text type="danger" style={{ fontSize: 12 }}>{err}</Text> : null,
    },
    {
      title: 'Длительность',
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: 120,
      render: (ms?: number, record?: UrlResult) => {
        // Завершённые URL — показываем зафиксированную длительность.
        if (ms !== undefined) {
          return <Text type="secondary">{formatDuration(ms)}</Text>;
        }
        // in_progress URL — живой таймер от startedAt.
        if (record?.startedAt) {
          const elapsed = now - new Date(record.startedAt).getTime();
          return <Text type="secondary">{formatDuration(elapsed)}</Text>;
        }
        return null;
      },
    },
  ];
}

/** Детальная информация по активному заданию: статус, прогресс, список URL. */
export function JobDetailsView() {
  const activeJob = useJobsStore((s) => s.activeJob);
  const activeLoading = useJobsStore((s) => s.activeLoading);
  const cancelActive = useJobsStore((s) => s.cancelActive);

  // Живое время — нужно только пока есть in_progress URL (для тикающего таймера).
  const hasInProgress = activeJob?.urls.some((u) => u.status === 'in_progress') ?? false;
  const now = useNow(hasInProgress ? 1000 : 0);
  const columns = useColumns(now);

  // Управляемый размер страницы пагинации. Без useState жёсткий pageSize
  // сбрасывался бы обратно при каждом ре-рендере (поллинг, тики времени).
  const [pageSize, setPageSize] = useState(20);

  if (activeLoading && !activeJob) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin tip="Загрузка задания…" />
      </div>
    );
  }

  if (!activeJob) {
    return (
      <Text type="secondary">
        Выберите задание слева или создайте новое, чтобы увидеть детали.
      </Text>
    );
  }

  const isTerminal = TERMINAL_JOB_STATUSES.has(activeJob.status);
  const progressPercent =
    activeJob.total > 0
      ? Math.round((activeJob.processedCount / activeJob.total) * 100)
      : 0;

  return (
    <div>
      <Space
        direction="vertical"
        size="middle"
        style={{ width: '100%', marginBottom: 16 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <Space>
            <Title level={5} style={{ margin: 0 }}>
              Задание
            </Title>
            <StatusBadge status={activeJob.status} />
          </Space>
          {!isTerminal && (
            <Popconfirm
              title="Отменить задание?"
              description="Не начатые URL будут отменены."
              onConfirm={cancelActive}
              okText="Отменить"
              cancelText="Нет"
            >
              <Button danger>Отменить задание</Button>
            </Popconfirm>
          )}
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <Text>
              Обработано {activeJob.processedCount} из {activeJob.total}
            </Text>
            <Text type="secondary">{progressPercent}%</Text>
          </div>
          <Progress
            percent={progressPercent}
            status={
              isTerminal
                ? activeJob.status === 'completed'
                  ? 'success'
                  : activeJob.status === 'cancelled'
                    ? 'normal'
                    : 'exception'
                : 'active'
            }
          />
          <Space size="small" style={{ marginTop: 8 }}>
            <Text type="success">Успех: {activeJob.success}</Text>
            <Text type="danger">Ошибки: {activeJob.error}</Text>
            <Text type="warning">Отменены: {activeJob.cancelled}</Text>
          </Space>
        </div>
      </Space>

      <Table<UrlResult>
        rowKey={(r) => r.url}
        columns={columns}
        dataSource={activeJob.urls}
        pagination={{
          pageSize,
          size: 'small',
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          onShowSizeChange: (_current, size) => setPageSize(size),
        }}
        size="small"
        locale={{ emptyText: 'Нет URL' }}
      />
    </div>
  );
}
