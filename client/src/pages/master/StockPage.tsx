import type { CSSProperties } from 'react';
import { Button, Descriptions, InputNumber, Modal, Select, Table, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  apiInventory,
  apiInventoryAdd,
  apiInventoryCategories,
  apiInventoryRemove,
  type InventoryRow,
} from '../../api/api';
import PageLoading from '../../components/PageLoading';
import PageError from '../../components/PageError';
import { formatRub } from '../../lib/format';

function qtyStyle(qty: number, min: number): CSSProperties {
  if (qty <= 0) return { borderColor: '#ff4d4f', color: '#ff4d4f' };
  if (qty < min) return { borderColor: '#ff4d4f', color: '#ff4d4f' };
  if (qty === min) return { borderColor: '#faad14', color: '#d48806' };
  return { borderColor: '#52c41a', color: '#389e0d' };
}

export default function StockPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>('');
  const [addFor, setAddFor] = useState<number | null>(null);
  const [removeFor, setRemoveFor] = useState<number | null>(null);
  const [amount, setAmount] = useState(1);
  const [detailItem, setDetailItem] = useState<InventoryRow | null>(null);

  const catQ = useQuery({
    queryKey: ['inventory', 'categories'],
    queryFn: apiInventoryCategories,
  });

  const q = useQuery({
    queryKey: ['inventory', page, category],
    queryFn: () =>
      apiInventory({
        page,
        pageSize: 10,
        category: category || undefined,
      }),
  });

  const add = useMutation({
    mutationFn: ({ id, a }: { id: number; a: number }) => apiInventoryAdd(id, a),
    onSuccess: async () => {
      message.success('Остаток обновлён');
      setAddFor(null);
      await qc.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const remove = useMutation({
    mutationFn: ({ id, a }: { id: number; a: number }) => apiInventoryRemove(id, a),
    onSuccess: async () => {
      message.success('Списание выполнено');
      setRemoveFor(null);
      await qc.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  if (q.isLoading || catQ.isLoading) return <PageLoading tip="Загрузка…" />;
  if (q.isError) return <PageError message={(q.error as Error).message} />;

  const data = q.data!;

  return (
    <>
      <Typography.Title level={3}>Склад</Typography.Title>
      <Select
        allowClear
        style={{ minWidth: 320, marginBottom: 16 }}
        placeholder="Фильтр по категории"
        options={catQ.data?.map(c => ({ value: c, label: c }))}
        value={category || undefined}
        onChange={v => {
          setCategory(v ?? '');
          setPage(1);
        }}
      />
      <Table
        rowKey="id"
        dataSource={data.items}
        loading={q.isFetching}
        pagination={{
          current: page,
          pageSize: data.pageSize,
          total: data.total,
          onChange: p => setPage(p),
          position: ['bottomRight'],
        }}
        columns={[
          {
            title: 'Название',
            dataIndex: 'name',
            render: (name: string, row) => (
              <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => setDetailItem(row)}>
                {name}
              </Button>
            ),
          },
          {
            title: 'Категория',
            dataIndex: 'category',
            render: (c: string) => <Tag>{c}</Tag>,
          },
          {
            title: 'Количество',
            dataIndex: 'quantity',
            width: 120,
            render: (qty: number, row) => (
              <Tag style={qtyStyle(qty, row.minQuantity)}>{qty} шт.</Tag>
            ),
          },
          { title: 'Мин. кол-во', dataIndex: 'minQuantity', width: 110 },
          {
            title: 'Цена',
            dataIndex: 'unitPrice',
            width: 120,
            render: (p: number) => formatRub(p),
          },
          { title: 'Поставщик', dataIndex: 'supplierName' },
          {
            title: 'Статус',
            width: 180,
            render: (_, row) => (
              <>
                <Button type="link" size="small" onClick={() => setDetailItem(row)}>
                  Просмотр
                </Button>
                <Button type="link" size="small" onClick={() => setAddFor(row.id)}>
                  Добавить
                </Button>
                <Button type="link" size="small" onClick={() => setRemoveFor(row.id)}>
                  Списать
                </Button>
              </>
            ),
          },
        ]}
      />

      <Modal
        title={detailItem ? detailItem.name : 'Позиция'}
        open={detailItem != null}
        onCancel={() => setDetailItem(null)}
        footer={<Button onClick={() => setDetailItem(null)}>Закрыть</Button>}
        width={520}
      >
        {detailItem && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Категория">
              <Tag>{detailItem.category}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Количество">
              <Tag style={qtyStyle(detailItem.quantity, detailItem.minQuantity)}>
                {detailItem.quantity} шт.
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Мин. количество">{detailItem.minQuantity} шт.</Descriptions.Item>
            <Descriptions.Item label="Цена за ед.">{formatRub(detailItem.unitPrice)}</Descriptions.Item>
            <Descriptions.Item label="Поставщик">{detailItem.supplierName}</Descriptions.Item>
            <Descriptions.Item label="ID (в БД)">{detailItem.id}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="Добавить на склад"
        open={addFor != null}
        onCancel={() => setAddFor(null)}
        onOk={() => addFor != null && add.mutate({ id: addFor, a: amount })}
        okButtonProps={{ loading: add.isPending }}
      >
        <Typography.Paragraph>Количество</Typography.Paragraph>
        <InputNumber min={1} value={amount} onChange={v => setAmount(Number(v) || 1)} />
      </Modal>

      <Modal
        title="Списать"
        open={removeFor != null}
        onCancel={() => setRemoveFor(null)}
        onOk={() => removeFor != null && remove.mutate({ id: removeFor, a: amount })}
        okButtonProps={{ loading: remove.isPending }}
      >
        <Typography.Paragraph>Количество</Typography.Paragraph>
        <InputNumber min={1} value={amount} onChange={v => setAmount(Number(v) || 1)} />
      </Modal>
    </>
  );
}
