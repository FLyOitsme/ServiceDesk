import { Card, Typography } from 'antd';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiTicket } from '../../api/api';
import PageLoading from '../../components/PageLoading';
import PageError from '../../components/PageError';
import TicketDetailView from '../../components/TicketDetailView';

export default function ClientTicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const id = ticketId ?? '';

  const q = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiTicket(id),
    enabled: !!id,
  });

  if (!id) return <PageError message="Не указан номер заявки" />;
  if (q.isLoading) return <PageLoading tip="Загрузка…" />;
  if (q.isError) return <PageError message={(q.error as Error).message} />;

  const t = q.data!;

  return (
    <>
      <Typography.Title level={3}>Заявка {t.publicNumber}</Typography.Title>
      <Link to="/tickets">← К списку заявок</Link>
      <Card style={{ marginTop: 16, maxWidth: 720 }}>
        <TicketDetailView ticket={t} />
      </Card>
    </>
  );
}
