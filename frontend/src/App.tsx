import { useEffect } from 'react';
import { Alert, Col, Layout, Row, Typography, Button, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { JobForm } from './components/JobForm';
import { JobList } from './components/JobList';
import { JobDetailsView } from './components/JobDetails';
import { useJobPolling } from './hooks/useJobPolling';
import { useJobsStore } from './store/jobsStore';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function App() {
  const error = useJobsStore((s) => s.error);
  const clearError = useJobsStore((s) => s.clearError);
  const fetchJobs = useJobsStore((s) => s.fetchJobs);

  // Запускаем поллинг активного задания (хук сам останавливается при терминальном статусе).
  useJobPolling();

  // При старте загружаем список заданий.
  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

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
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => fetchJobs()}
                >
                  Обновить
                </Button>
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
