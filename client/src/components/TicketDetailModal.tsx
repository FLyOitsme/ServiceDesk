import { Alert, Button, Modal, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiTicket } from '../api/api';
import AddPaymentModal from './AddPaymentModal';
import TicketDetailView from './TicketDetailView';

type Props = {
  open: boolean;
  publicNumber: string | null;
  onClose: () => void;
  title?: string;
  /** Показать действие «Добавить оплату» (только для администратора). */
  showAddPayment?: boolean;
};

export default function TicketDetailModal({
  open,
  publicNumber,
  onClose,
  title = 'Заявка',
  showAddPayment = false,
}: Props) {
  const [paymentOpen, setPaymentOpen] = useState(false);

  useEffect(() => {
    if (!open) setPaymentOpen(false);
  }, [open]);

  const q = useQuery({
    queryKey: ['ticket', publicNumber],
    queryFn: () => apiTicket(publicNumber!),
    enabled: open && !!publicNumber,
  });

  return (
    <>
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
        {open && publicNumber && q.data && (
          <>
            <TicketDetailView ticket={q.data} />
            {showAddPayment ? (
              <div style={{ marginTop: 16 }}>
                <Button type="primary" onClick={() => setPaymentOpen(true)}>
                  Добавить оплату
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Modal>
      <AddPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        lockTicketNumber={publicNumber}
        defaultAmount={q.data?.cost ?? null}
      />
    </>
  );
}
