import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <Result
      status="403"
      title="403"
      subTitle="Нет доступа к этому разделу"
      extra={<Button type="primary" onClick={() => navigate('/')}>На главную</Button>}
    />
  );
}
