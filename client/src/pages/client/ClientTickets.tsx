import { Typography } from 'antd';

/** Заглушка: список заявок клиента. */
export default function ClientTickets() {
  return (
    <>
      <Typography.Title level={3}>Мои заявки</Typography.Title>
      <Typography.Paragraph type="secondary">
        Заглушка: таблица заявок и поиск по номеру — подключение к API позже.
      </Typography.Paragraph>
    </>
  );
}
