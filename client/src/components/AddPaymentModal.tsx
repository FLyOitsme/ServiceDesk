import { Checkbox, Form, Input, InputNumber, Modal, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFinanceAddPayment } from '../api/api';

type FormValues = {
  ticketNumber: string;
  amount: number;
  description?: string;
  pending: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Если задан — поле номера заявки только для чтения (из карточки заявки). */
  lockTicketNumber?: string | null;
  /** Подставить сумму (например стоимость из заявки). */
  defaultAmount?: number | null;
};

export default function AddPaymentModal({ open, onClose, lockTicketNumber, defaultAmount }: Props) {
  const [form] = Form.useForm<FormValues>();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      ticketNumber: lockTicketNumber ?? '',
      amount: defaultAmount != null && defaultAmount > 0 ? defaultAmount : undefined,
      description: '',
      pending: false,
    });
  }, [open, lockTicketNumber, defaultAmount, form]);

  const add = useMutation({
    mutationFn: (values: FormValues) =>
      apiFinanceAddPayment({
        ticketNumber: values.ticketNumber.trim(),
        amount: values.amount,
        description: values.description?.trim() || undefined,
        pending: values.pending,
      }),
    onSuccess: async res => {
      message.success(`Оплата добавлена: ${res.publicNumber}`);
      await qc.invalidateQueries({ queryKey: ['finance'] });
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
      await qc.invalidateQueries({ queryKey: ['tickets'] });
      await qc.invalidateQueries({ queryKey: ['ticket'] });
      onClose();
    },
    onError: (e: Error) => message.error(e.message),
  });

  return (
    <Modal
      title="Добавить оплату к заявке"
      open={open}
      onCancel={onClose}
      okText="Сохранить"
      cancelText="Отмена"
      confirmLoading={add.isPending}
      onOk={() => form.submit()}
      destroyOnClose
      width={480}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ pending: false }}
        onFinish={values => add.mutate(values)}
        autoComplete="off"
      >
        <Form.Item
          name="ticketNumber"
          label="Номер заявки"
          rules={[{ required: true, message: 'Укажите номер заявки' }]}
        >
          <Input placeholder="REQ-001" disabled={!!lockTicketNumber} />
        </Form.Item>
        <Form.Item
          name="amount"
          label="Сумма, ₽"
          rules={[
            { required: true, message: 'Укажите сумму' },
            {
              type: 'number',
              min: 0.01,
              message: 'Сумма должна быть больше нуля',
            },
          ]}
        >
          <InputNumber min={0.01} step={100} style={{ width: '100%' }} placeholder="0" />
        </Form.Item>
        <Form.Item name="description" label="Описание (необязательно)">
          <Input placeholder="Наличные, перевод…" />
        </Form.Item>
        <Form.Item name="pending" valuePropName="checked" style={{ marginBottom: 0 }}>
          <Checkbox>Ожидает подтверждения (не зачислять как завершённую)</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
