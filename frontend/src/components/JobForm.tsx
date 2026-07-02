import { useState } from 'react';
import { App, Button, Form, Input, Space, Typography } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import { useJobsStore } from '../store/jobsStore';

const { TextArea } = Input;
const { Text } = Typography;

const URL_RE = /^https?:\/\/.+/i;

/** Форма создания задания: textarea с URL (по одному на строку). */
export function JobForm() {
  const [text, setText] = useState('');
  const createJob = useJobsStore((s) => s.createJob);
  const submitting = useJobsStore((s) => s.submitting);
  const { message } = App.useApp();

  const onSubmit = async () => {
    const urls = text
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      message.warning('Введите хотя бы один URL');
      return;
    }
    const invalid = urls.filter((u) => !URL_RE.test(u));
    if (invalid.length > 0) {
      message.error(
        `Невалидные URL (нужен http:// или https://): ${invalid.join(', ')}`,
      );
      return;
    }
    if (urls.length > 500) {
      message.error('Максимум 500 URL в задании');
      return;
    }

    await createJob(urls);
    if (!useJobsStore.getState().error) {
      setText('');
      message.success('Задание запущено');
    }
  };

  return (
    <Form layout="vertical">
      <Form.Item label="Список URL (по одному на строку)">
        <TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Cmd/Ctrl+Enter — отправить форму.
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              void onSubmit();
            }
          }}
          placeholder={
            'https://example.com\nhttps://github.com/some/repo\nhttp://localhost:9000/ok'
          }
          autoSize={{ minRows: 8, maxRows: 16 }}
        />
      </Form.Item>
      <Space style={{ width: '100%' }}>
        <Button
          type="primary"
          onClick={onSubmit}
          loading={submitting}
          disabled={!text.trim()}
          style={{ marginRight: 'auto' }}
        >
          Запустить проверку
        </Button>
        <Button
          type="default"
          icon={<ClearOutlined />}
          disabled={!text}
          onClick={() => setText('')}
        />
      </Space>
      <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
        Поддерживается http/https. До 500 URL. Проверка выполняется HTTP
        HEAD-запросами. Отправить форму — Cmd/Ctrl+Enter.
      </Text>
    </Form>
  );
}
