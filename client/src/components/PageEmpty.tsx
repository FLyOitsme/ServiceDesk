import { Empty } from 'antd';

export default function PageEmpty({ description = 'Нет данных' }: { description?: string }) {
  return <Empty description={description} style={{ marginTop: 48 }} />;
}
