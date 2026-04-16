import { Button, Card, Col, Row, Table, Typography } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  LockOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { apiDashboard, type ClientDashboard as ClientDashboardData } from '../../api/api';
import TicketDetailModal from '../../components/TicketDetailModal';
import PageLoading from '../../components/PageLoading';
import PageError from '../../components/PageError';
import { formatRub, formatRuDate } from '../../lib/format';
import { StatusBadge } from '../../components/TicketBadges';

export default function ClientDashboard() {
  const [detailTicket, setDetailTicket] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ['dashboard'],
    queryFn: apiDashboard,
  });

  if (q.isLoading) return <PageLoading tip="Загрузка…" />;
  if (q.isError) return <PageError message={(q.error as Error).message} />;
  const d = q.data as ClientDashboardData;
  if (!('welcomeName' in d)) return <PageError message="Неверный ответ API" />;

  const { stats, tickets, welcomeName } = d;

  return (
    <>
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        Добро пожаловать, {welcomeName}!
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Здесь вы можете отслеживать статус ваших заявок
      </Typography.Paragraph>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ToolOutlined style={{ fontSize: 28, color: '#1677ff' }} />
              <div>
                <Typography.Text type="secondary">В работе</Typography.Text>
                <Typography.Title level={3} style={{ margin: 0 }}>
                  {stats.inProgress}
                </Typography.Title>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ClockCircleOutlined style={{ fontSize: 28, color: '#faad14' }} />
              <div>
                <Typography.Text type="secondary">Диагностика</Typography.Text>
                <Typography.Title level={3} style={{ margin: 0 }}>
                  {stats.diagnostics}
                </Typography.Title>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircleOutlined style={{ fontSize: 28, color: '#52c41a' }} />
              <div>
                <Typography.Text type="secondary">Готово</Typography.Text>
                <Typography.Title level={3} style={{ margin: 0 }}>
                  {stats.ready}
                </Typography.Title>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <LockOutlined style={{ fontSize: 28, color: '#8c8c8c' }} />
              <div>
                <Typography.Text type="secondary">Ожидает запчасть</Typography.Text>
                <Typography.Title level={3} style={{ margin: 0 }}>
                  {stats.waitingParts}
                </Typography.Title>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Typography.Title level={4}>Мои заявки</Typography.Title>
      <Table
        rowKey="publicNumber"
        dataSource={tickets}
        pagination={false}
        columns={[
          {
            title: '№ заявки',
            dataIndex: 'publicNumber',
            width: 120,
          },
          {
            title: 'Устройство',
            render: (_, row) => (
              <div>
                <div>{row.deviceType}</div>
                <Typography.Text type="secondary">{row.deviceModel}</Typography.Text>
              </div>
            ),
          },
          {
            title: 'Статус',
            dataIndex: 'status',
            render: (s: string) => <StatusBadge status={s} />,
          },
          {
            title: 'Стоимость',
            render: (_, row) => formatRub(row.cost),
            width: 120,
          },
          {
            title: 'Дата создания',
            dataIndex: 'createdAtUtc',
            render: (iso: string) => formatRuDate(iso),
            width: 130,
          },
          {
            title: '',
            width: 200,
            render: (_, row) => (
              <>
                <Button type="link" size="small" onClick={() => setDetailTicket(row.publicNumber)}>
                  Просмотр
                </Button>
                <Link to={`/tickets/${encodeURIComponent(row.publicNumber)}`}>Подробнее</Link>
              </>
            ),
          },
        ]}
      />

      <TicketDetailModal
        open={detailTicket != null}
        publicNumber={detailTicket}
        onClose={() => setDetailTicket(null)}
      />
    </>
  );
}
