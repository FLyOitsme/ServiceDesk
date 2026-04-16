import { Card, Col, Row, Table, Typography } from 'antd';
import {
  DollarOutlined,
  FileTextOutlined,
  IdcardOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { apiDashboard, type AdminDashboard as AdminDashboardData } from '../../api/api';
import PageLoading from '../../components/PageLoading';
import PageError from '../../components/PageError';
import { formatRelativeRu } from '../../lib/format';
import { activityKindLabel } from '../../lib/ticketLabels';
import { Tag } from 'antd';

const kindColors: Record<string, string> = {
  NewTicket: 'blue',
  TicketCompleted: 'green',
  Payment: 'gold',
  UserRegistered: 'purple',
};

export default function AdminDashboard() {
  const q = useQuery({
    queryKey: ['dashboard'],
    queryFn: apiDashboard,
  });

  if (q.isLoading) return <PageLoading tip="Загрузка…" />;
  if (q.isError) return <PageError message={(q.error as Error).message} />;
  const d = q.data as AdminDashboardData;
  if (!('activities' in d)) return <PageError message="Неверный ответ API" />;

  const { stats, activities } = d;

  return (
    <>
      <Typography.Title level={3}>Dashboard</Typography.Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: '#e6f4ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FileTextOutlined style={{ fontSize: 28, color: '#1677ff' }} />
              <div>
                <Typography.Text type="secondary">Всего заявок</Typography.Text>
                <Typography.Title level={3} style={{ margin: 0 }}>
                  {stats.totalTickets}
                </Typography.Title>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: '#fffbe6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <DollarOutlined style={{ fontSize: 28, color: '#faad14' }} />
              <div>
                <Typography.Text type="secondary">Доход за месяц</Typography.Text>
                <Typography.Title level={3} style={{ margin: 0 }}>
                  {Math.round(stats.monthlyIncome).toLocaleString('ru-RU')} ₽
                </Typography.Title>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: '#f6ffed' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <IdcardOutlined style={{ fontSize: 28, color: '#52c41a' }} />
              <div>
                <Typography.Text type="secondary">Активные мастера</Typography.Text>
                <Typography.Title level={3} style={{ margin: 0 }}>
                  {stats.activeMasters}
                </Typography.Title>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <UserAddOutlined style={{ fontSize: 28, color: '#8c8c8c' }} />
              <div>
                <Typography.Text type="secondary">Новые клиенты</Typography.Text>
                <Typography.Title level={3} style={{ margin: 0 }}>
                  {stats.newClients}
                </Typography.Title>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Typography.Title level={4}>Последние действия</Typography.Title>
      <Table
        rowKey={r => `${r.title}-${r.createdAtUtc}`}
        dataSource={activities}
        pagination={false}
        columns={[
          {
            title: 'Действие',
            render: (_, row) => (
              <div>
                <div>{row.title}</div>
                <Typography.Text type="secondary">{row.subtitle}</Typography.Text>
              </div>
            ),
          },
          {
            title: 'Тип',
            dataIndex: 'kind',
            width: 160,
            render: (k: string) => (
              <Tag color={kindColors[k] ?? 'default'}>{activityKindLabel[k] ?? k}</Tag>
            ),
          },
          {
            title: 'Время',
            dataIndex: 'createdAtUtc',
            width: 140,
            render: (iso: string) => formatRelativeRu(iso),
          },
        ]}
      />
    </>
  );
}
