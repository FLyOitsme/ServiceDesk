import { Button, Select, Table, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiTickets, apiTicketTake } from '../../api/api';
import TicketDetailModal from '../../components/TicketDetailModal';
import PageLoading from '../../components/PageLoading';
import PageError from '../../components/PageError';
import { formatRuDate } from '../../lib/format';
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

export default function MasterTickets() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [detailTicket, setDetailTicket] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['tickets', 'master', page, status, priority],
    queryFn: () =>
      apiTickets({
        page,
        pageSize: 10,
        status: status || undefined,
        priority: priority || undefined,
      }),
  });

  const take = useMutation({
    mutationFn: (id: string) => apiTicketTake(id),
    onSuccess: async () => {
      message.success('Заявка назначена вам');
      await qc.invalidateQueries({ queryKey: ['tickets'] });
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  if (q.isLoading) return <PageLoading tip="Загрузка…" />;
  if (q.isError) return <PageError message={(q.error as Error).message} />;
  const data = q.data!;

  return (
    <>
      <Typography.Title level={3}>Список заявок</Typography.Title>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select
          style={{ minWidth: 200 }}
          options={statusOptions}
          value={status}
          onChange={v => {
            setStatus(v);
            setPage(1);
          }}
          placeholder="Фильтр по статусу"
        />
        <Select
          style={{ minWidth: 200 }}
          options={priorityOptions}
          value={priority}
          onChange={v => {
            setPriority(v);
            setPage(1);
          }}
          placeholder="Фильтр по приоритету"
        />
      </div>
      <Table
        rowKey="publicNumber"
        dataSource={data.items}
        loading={q.isFetching}
        scroll={{ x: 1100 }}
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
            width: 180,
            render: (_, row) => `${row.deviceType} ${row.deviceModel}`,
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
            title: 'Описание',
            dataIndex: 'description',
            ellipsis: true,
          },
          {
            title: '',
            width: 200,
            fixed: 'right',
            render: (_, row) => (
              <>
                <Button type="link" size="small" onClick={() => setDetailTicket(row.publicNumber)}>
                  Просмотр
                </Button>
                {row.canTake ? (
                  <Button type="link" size="small" onClick={() => take.mutate(row.publicNumber)}>
                    Взяться
                  </Button>
                ) : null}
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
