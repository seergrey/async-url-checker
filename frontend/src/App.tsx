import { useEffect } from 'react';
import { Alert, Badge, Button, Col, Layout, Row, Space, Typography } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { JobForm } from './components/JobForm';
import { JobList } from './components/JobList';
import { JobDetailsView } from './components/JobDetails';
import { useJobPolling } from './hooks/useJobPolling';
import { useJobsAutoRefresh } from './hooks/useJobsAutoRefresh';
import { useJobsStore } from './store/jobsStore';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function App() {
  const error = useJobsStore((s) => s.error);
  const clearError = useJobsStore((s) => s.clearError);
  const fetchJobs = useJobsStore((s) => s.fetchJobs);
  const activeJobId = useJobsStore((s) => s.activeJobId);
  const selectJob = useJobsStore((s) => s.selectJob);
  const jobsLoading = useJobsStore((s) => s.jobsLoading);

  // Поллинг активного задания + авто-обновление списка + индикатор.
  useJobPolling();
  const secondsAgo = useJobsAutoRefresh();

  // При старте: грузим список и, если есть сохранённое активное задание (из
  // localStorage после F5), подгружаем его детали.
  useEffect(() => {
    void fetchJobs();
    if (activeJobId) {
      void selectJob(activeJobId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529' }}>
        <Title level={4} style={{ color: '#fff', margin: '14px 0' }}>
          URL Checker
        </Title>
      </Header>
      <Content style={{ padding: 24 }}>
        {error && (
          <Alert
            type="error"
            message={error}
            closable
            onClose={clearError}
            style={{ marginBottom: 16 }}
          />
        )}
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8} lg={7} xl={6}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <JobForm />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography.Text strong>Последние задания</Typography.Text>
                <Space size="small">
                  {secondsAgo !== null && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      обновлено {secondsAgo}с назад
                    </Text>
                  )}
                  <Badge dot status="processing" offset={[-2, 0]}>
                    <Button
                      type="text"
                      size="small"
                      icon={<SyncOutlined />}
                      loading={jobsLoading}
                      onClick={() => fetchJobs()}
                    >
                      Обновить
                    </Button>
                  </Badge>
                </Space>
              </div>
              <JobList />
            </Space>
          </Col>
          <Col xs={24} md={16} lg={17} xl={18}>
            <JobDetailsView />
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
