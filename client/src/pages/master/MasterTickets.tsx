import { Typography } from 'antd';

/** Заглушка: очередь заявок мастера. */
export default function MasterTickets() {
  return (
    <>
      <Typography.Title level={3}>Заявки</Typography.Title>
      <Typography.Paragraph type="secondary">
        Заглушка: взятие в работу, смена статуса и стоимости — позже.
      </Typography.Paragraph>
    </>
  );
}
