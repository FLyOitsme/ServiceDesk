import { Alert } from 'antd';

export default function PageError({ message, title = 'Ошибка' }: { message: string; title?: string }) {
  return <Alert type="error" message={title} description={message} showIcon style={{ marginTop: 24 }} />;
}
