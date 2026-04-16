import { Button, Card, Col, Row, Select, Table, Typography, message, Modal } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiTickets, apiTicketsStats, apiTicketDelete } from '../../api/api';
import TicketDetailModal from '../../components/TicketDetailModal';
import PageLoading from '../../components/PageLoading';
import PageError from '../../components/PageError';
import { formatRub, formatRuDate } from '../../lib/format';
import { PriorityBadge, StatusBadge } from '../../components/TicketBadges';

const statusOptions = [
  { value: '', label: 'Все статусы' },
  { value: 'New', label: 'Новая' },
  { value: 'Diagnostics', label: 'Диагностика' },
  { value: 'InProgress', label: 'В работе' },
  { value: 'WaitingParts', label: 'Ожидает' },
  { value: 'Ready', label: 'Готово' },
  { value: 'Completed', label: 'Завершено' },
];

const priorityOptions = [
  { value: '', label: 'Все приоритеты' },
  { value: 'Low', label: 'Низкий' },
  { value: 'Normal', label: 'Обычный' },
  { value: 'High', label: 'Высокий' },
  { value: 'Urgent', label: 'Срочно' },
];

export default function AdminTickets() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [detailTicket, setDetailTicket] = useState<string | null>(null);

  const statsQ = useQuery({
    queryKey: ['tickets', 'stats'],
    queryFn: apiTicketsStats,
  });

  const q = useQuery({
    queryKey: ['tickets', 'admin', page, status, priority],
    queryFn: () =>
      apiTickets({
        page,
        pageSize: 10,
        status: status || undefined,
        priority: priority || undefined,
      }),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiTicketDelete(id),
    onSuccess: async () => {
      message.success('Заявка удалена');
      await qc.invalidateQueries({ queryKey: ['tickets'] });
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  if (q.isLoading || statsQ.isLoading) return <PageLoading tip="Загрузка…" />;
  if (q.isError) return <PageError message={(q.error as Error).message} />;
  if (statsQ.isError) return <PageError message={(statsQ.error as Error).message} />;

  const data = q.data!;
  const st = statsQ.data!;

  const confirmDelete = (id: string) => {
    Modal.confirm({
      title: 'Удалить заявку?',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: () => del.mutateAsync(id),
    });
  };

  return (
    <>
      <Typography.Title level={3}>Все заявки</Typography.Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ background: '#e6f4ff' }}>
            <Typography.Text type="secondary">Новые</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {st.newCount}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: '#f6ffed' }}>
            <Typography.Text type="secondary">Завершено</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {st.completedCount}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: '#fff7e6' }}>
            <Typography.Text type="secondary">В работе</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {st.inProgressCount}
            </Typography.Title>
          </Card>
        </Col>
      </Row>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select
          style={{ minWidth: 200 }}
          options={statusOptions}
          value={status}
          onChange={v => {
            setStatus(v);
            setPage(1);
          }}
        />
        <Select
          style={{ minWidth: 200 }}
          options={priorityOptions}
          value={priority}
          onChange={v => {
            setPriority(v);
            setPage(1);
          }}
        />
      </div>

      <Table
        rowKey="publicNumber"
        dataSource={data.items}
        loading={q.isFetching}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize: data.pageSize,
          total: data.total,
          onChange: p => setPage(p),
          position: ['bottomRight'],
        }}
        columns={[
          { title: '№ заявки', dataIndex: 'publicNumber', width: 100 },
          { title: 'Клиент', dataIndex: 'clientName', width: 140 },
          {
            title: 'Устройство',
            width: 200,
            render: (_, row) => (
              <span>
                {row.deviceType} {row.deviceModel}
              </span>
            ),
          },
          {
            title: 'Статус',
            dataIndex: 'status',
            width: 130,
            render: (s: string) => <StatusBadge status={s} />,
          },
          {
            title: 'Приоритет',
            dataIndex: 'priority',
            width: 120,
            render: (p: string) => <PriorityBadge priority={p} />,
          },
          {
            title: 'Мастер',
            dataIndex: 'masterName',
            width: 140,
            render: (n: string | null) => n ?? 'Не назначен',
          },
          {
            title: 'Дата',
            dataIndex: 'createdAtUtc',
            width: 110,
            render: (iso: string) => formatRuDate(iso),
          },
          {
            title: 'Стоимость',
            width: 110,
            render: (_, row) => formatRub(row.cost),
          },
          {
            title: '',
            width: 180,
            fixed: 'right',
            render: (_, row) => (
              <>
                <Button type="link" size="small" onClick={() => setDetailTicket(row.publicNumber)}>
                  Просмотр
                </Button>
                <Button type="link" danger size="small" onClick={() => confirmDelete(row.publicNumber)}>
                  Удалить
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
