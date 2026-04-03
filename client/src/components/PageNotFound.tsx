import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function PageNotFound() {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="404"
      subTitle="Страница не найдена"
      extra={<Button type="primary" onClick={() => navigate('/')}>На главную</Button>}
    />
  );
}
