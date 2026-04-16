import { Button, Input, Table, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiTickets } from '../../api/api';
import TicketDetailModal from '../../components/TicketDetailModal';
import PageLoading from '../../components/PageLoading';
import PageError from '../../components/PageError';
import { formatRub, formatRuDate } from '../../lib/format';
import { StatusBadge } from '../../components/TicketBadges';

export default function ClientTickets() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [detailTicket, setDetailTicket] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['tickets', 'client', page, search],
    queryFn: () => apiTickets({ page, pageSize: 10, search: search.trim() || undefined }),
  });

  if (q.isLoading) return <PageLoading tip="Загрузка заявок…" />;
  if (q.isError) return <PageError message={(q.error as Error).message} />;
  const data = q.data!;

  return (
    <>
      <Typography.Title level={3}>Мои заявки</Typography.Title>
      <Input
        allowClear
        placeholder="Введите номер заявки"
        style={{ maxWidth: 360, marginBottom: 16 }}
        suffix={<SearchOutlined />}
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      <Table
        rowKey="publicNumber"
        dataSource={data.items}
        loading={q.isFetching}
        pagination={{
          current: page,
          pageSize: data.pageSize,
          total: data.total,
          onChange: p => setPage(p),
          showSizeChanger: false,
          position: ['bottomRight'],
        }}
        columns={[
          { title: '№ заявки', dataIndex: 'publicNumber', width: 110 },
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
            width: 130,
            render: (iso: string) => formatRuDate(iso),
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
