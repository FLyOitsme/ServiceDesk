import { Typography } from 'antd';
import { useParams } from 'react-router-dom';

/** Заглушка: карточка заявки. */
export default function ClientTicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  return (
    <>
      <Typography.Title level={3}>Заявка {ticketId ?? '—'}</Typography.Title>
      <Typography.Paragraph type="secondary">
        Заглушка: описание, статус, стоимость — после подключения API.
      </Typography.Paragraph>
    </>
  );
}
