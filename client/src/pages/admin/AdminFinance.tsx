import { Button, Card, Col, DatePicker, Descriptions, Modal, Row, Table, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { apiFinanceSummary, apiFinanceTransactions, type TransactionRow } from '../../api/api';
import PageLoading from '../../components/PageLoading';
import PageError from '../../components/PageError';
import { formatRuDate } from '../../lib/format';
import { txStatusLabel, txTypeLabel } from '../../lib/ticketLabels';

const { RangePicker } = DatePicker;

export default function AdminFinance() {
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [txDetail, setTxDetail] = useState<TransactionRow | null>(null);

  const startIso = range ? range[0].startOf('day').toISOString() : undefined;
  const endIso = range ? range[1].startOf('day').toISOString() : undefined;

  const summaryQ = useQuery({
    queryKey: ['finance', 'summary', startIso, endIso],
    queryFn: () => apiFinanceSummary(startIso, endIso),
  });

  const [page, setPage] = useState(1);
  const txQ = useQuery({
    queryKey: ['finance', 'transactions', page, startIso, endIso],
    queryFn: () =>
      apiFinanceTransactions({
        page,
        pageSize: 10,
        start: startIso,
        end: endIso,
      }),
  });

  const amountCell = useMemo(
    () => (type: string, amount: number) => {
      const isInc = type === 'Income';
      const sign = isInc ? '+' : '−';
      const color = isInc ? '#52c41a' : '#ff4d4f';
      return (
        <span style={{ color, fontWeight: 600 }}>
          {sign}
          {Math.abs(amount).toLocaleString('ru-RU')} ₽
        </span>
      );
    },
    []
  );

  if (summaryQ.isError) return <PageError message={(summaryQ.error as Error).message} />;
  if (txQ.isError) return <PageError message={(txQ.error as Error).message} />;
  if (!summaryQ.data || !txQ.data) return <PageLoading tip="Загрузка…" />;

  const summary = summaryQ.data;
  const tx = txQ.data;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Все заявки
        </Typography.Title>
        <RangePicker
          value={range ?? undefined}
          onChange={dates => {
            if (dates && dates[0] && dates[1]) setRange([dates[0], dates[1]]);
            else setRange(null);
            setPage(1);
          }}
          format="DD.MM.YYYY"
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: 24, marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ background: '#e6f4ff' }}>
            <Typography.Text type="secondary">Доход</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {Math.round(summary.income).toLocaleString('ru-RU')}₽
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: '#f6ffed' }}>
            <Typography.Text type="secondary">Прибыль</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {Math.round(summary.profit).toLocaleString('ru-RU')}₽
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: '#fff2f0' }}>
            <Typography.Text type="secondary">Расход</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {Math.round(summary.expense).toLocaleString('ru-RU')}₽
            </Typography.Title>
          </Card>
        </Col>
      </Row>

      <Typography.Title level={4}>Транзакции</Typography.Title>
      <Table
          rowKey="publicNumber"
          dataSource={tx.items}
          loading={txQ.isFetching}
          pagination={{
            current: page,
            pageSize: tx.pageSize,
            total: tx.total,
            onChange: p => setPage(p),
            position: ['bottomRight'],
          }}
          columns={[
            { title: 'ID', dataIndex: 'publicNumber', width: 100 },
            {
              title: 'Заявка',
              dataIndex: 'ticketNumber',
              render: (n: string | null) => n ?? '—',
            },
            { title: 'Описание', dataIndex: 'description', ellipsis: true },
            {
              title: 'Тип',
              dataIndex: 'type',
              width: 100,
              render: (t: string) => (
                <Tag color={t === 'Income' ? 'success' : 'error'}>{txTypeLabel[t] ?? t}</Tag>
              ),
            },
            {
              title: 'Сумма',
              render: (_, row) => amountCell(row.type, row.amount),
              width: 140,
            },
            {
              title: 'Дата',
              dataIndex: 'dateUtc',
              width: 120,
              render: (iso: string) => formatRuDate(iso),
            },
            {
              title: 'Статус',
              dataIndex: 'status',
              width: 120,
              render: (s: string) => (
                <Tag color={s === 'Completed' ? 'success' : 'warning'}>{txStatusLabel[s] ?? s}</Tag>
              ),
            },
            {
              title: '',
              width: 100,
              render: (_, row) => (
                <Button type="link" size="small" onClick={() => setTxDetail(row)}>
                  Просмотр
                </Button>
              ),
            },
          ]}
        />

      <Modal
        title={txDetail ? `Транзакция ${txDetail.publicNumber}` : 'Транзакция'}
        open={txDetail != null}
        onCancel={() => setTxDetail(null)}
        footer={<Button onClick={() => setTxDetail(null)}>Закрыть</Button>}
        width={560}
      >
        {txDetail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{txDetail.publicNumber}</Descriptions.Item>
            <Descriptions.Item label="Заявка">{txDetail.ticketNumber ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Описание">{txDetail.description}</Descriptions.Item>
            <Descriptions.Item label="Тип">
              <Tag color={txDetail.type === 'Income' ? 'success' : 'error'}>
                {txTypeLabel[txDetail.type] ?? txDetail.type}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Сумма">
              {amountCell(txDetail.type, txDetail.amount)}
            </Descriptions.Item>
            <Descriptions.Item label="Дата">{formatRuDate(txDetail.dateUtc)}</Descriptions.Item>
            <Descriptions.Item label="Статус">
              <Tag color={txDetail.status === 'Completed' ? 'success' : 'warning'}>
                {txStatusLabel[txDetail.status] ?? txDetail.status}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
}
