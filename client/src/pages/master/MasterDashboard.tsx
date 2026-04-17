import { Button, Card, Col, Row, Table, Typography, message } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  LockOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiDashboard, apiTicketTake, type MasterDashboard as MasterDashboardData } from '../../api/api';
import PageLoading from '../../components/PageLoading';
import PageError from '../../components/PageError';
import { formatRuDate } from '../../lib/format';
import { PriorityBadge } from '../../components/TicketBadges';
import TicketDetailModal from '../../components/TicketDetailModal';

export default function MasterDashboard() {
  const qc = useQueryClient();
  const [detailTicket, setDetailTicket] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ['dashboard'],
    queryFn: apiDashboard,
  });

  const take = useMutation({
    mutationFn: (id: string) => apiTicketTake(id),
    onSuccess: async () => {
      message.success('Заявка взята в работу');
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
      await qc.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  if (q.isLoading) return <PageLoading tip="Загрузка…" />;
  if (q.isError) return <PageError message={(q.error as Error).message} />;
  const d = q.data as MasterDashboardData;
  if (!('newRequests' in d)) return <PageError message="Неверный ответ API" />;

  const { stats, newRequests } = d;

  return (
    <>
      <Typography.Title level={3}>Dashboard</Typography.Title>

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

      <Typography.Title level={4}>Новые заявки</Typography.Title>
      <Table
        rowKey="publicNumber"
        dataSource={newRequests}
        pagination={{pageSize: 3}}
        columns={[
          { title: '№ заявки', dataIndex: 'publicNumber', width: 110 },
          { title: 'Клиент', dataIndex: 'clientName' },
          { title: 'Устройство', dataIndex: 'device' },
          { title: 'Описание', dataIndex: 'description', ellipsis: true },
          {
            title: 'Дата создания',
            dataIndex: 'createdAtUtc',
            width: 120,
            render: (iso: string) => formatRuDate(iso),
          },
          {
            title: 'Приоритет',
            dataIndex: 'priority',
            width: 120,
            render: (p: string) => <PriorityBadge priority={p} />,
          },
          {
            title: '',
            width: 220,
            render: (_, row) => (
              <>
                <Button type="link" size="small" onClick={() => setDetailTicket(row.publicNumber)}>
                  Просмотр
                </Button>
                <Button
                  type="link"
                  loading={take.isPending}
                  onClick={() => take.mutate(row.publicNumber)}
                >
                  Взять в работу
                </Button>
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
