import { Typography } from 'antd';

/** Заглушка: дашборд клиента (статистика по заявкам — позже). */
export default function ClientDashboard() {
  return (
    <>
      <Typography.Title level={3}>Dashboard</Typography.Title>
      <Typography.Paragraph type="secondary">
        Заглушка: здесь будет сводка по вашим заявкам.
      </Typography.Paragraph>
    </>
  );
}
