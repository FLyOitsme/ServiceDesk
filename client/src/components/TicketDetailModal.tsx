import { Modal, Spin, Alert } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { apiTicket } from '../api/api';
import TicketDetailView from './TicketDetailView';

type Props = {
  open: boolean;
  publicNumber: string | null;
  onClose: () => void;
  title?: string;
};

export default function TicketDetailModal({ open, publicNumber, onClose, title = 'Заявка' }: Props) {
  const q = useQuery({
    queryKey: ['ticket', publicNumber],
    queryFn: () => apiTicket(publicNumber!),
    enabled: open && !!publicNumber,
  });

  return (
    <Modal
      title={publicNumber ? `${title} ${publicNumber}` : title}
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
    >
      {open && publicNumber && q.isLoading && <Spin style={{ display: 'block', padding: 24 }} />}
      {open && publicNumber && q.isError && (
        <Alert type="error" message={(q.error as Error).message} showIcon />
      )}
      {open && publicNumber && q.data && <TicketDetailView ticket={q.data} />}
    </Modal>
  );
}
