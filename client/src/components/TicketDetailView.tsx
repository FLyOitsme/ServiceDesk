import { Descriptions, Image, Typography } from 'antd';
import type { TicketDetail } from '../api/api';
import { formatRub, formatRuDate } from '../lib/format';
import { PriorityBadge, StatusBadge } from './TicketBadges';

function ticketImageSrc(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
}

/** Карточка полных данных заявки (страница или модальное окно). */
export default function TicketDetailView({ ticket }: { ticket: TicketDetail }) {
  const img = ticketImageSrc(ticket.imageUrl);
  return (
    <>
      {img && (
        <div style={{ marginBottom: 16 }}>
          <Image src={img} alt="" style={{ maxWidth: 320 }} />
        </div>
      )}
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="№ заявки">{ticket.publicNumber}</Descriptions.Item>
        <Descriptions.Item label="Клиент">{ticket.clientName}</Descriptions.Item>
        <Descriptions.Item label="Тип устройства">{ticket.deviceType}</Descriptions.Item>
        <Descriptions.Item label="Производитель">{ticket.manufacturer}</Descriptions.Item>
        <Descriptions.Item label="Модель">{ticket.deviceModel}</Descriptions.Item>
        <Descriptions.Item label="Статус">
          <StatusBadge status={ticket.status} />
        </Descriptions.Item>
        <Descriptions.Item label="Приоритет">
          <PriorityBadge priority={ticket.priority} />
        </Descriptions.Item>
        <Descriptions.Item label="Мастер">{ticket.masterName ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Стоимость">{formatRub(ticket.cost)}</Descriptions.Item>
        <Descriptions.Item label="Дата создания">{formatRuDate(ticket.createdAtUtc)}</Descriptions.Item>
        <Descriptions.Item label="Описание">
          <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {ticket.description}
          </Typography.Paragraph>
        </Descriptions.Item>
      </Descriptions>
    </>
  );
}
