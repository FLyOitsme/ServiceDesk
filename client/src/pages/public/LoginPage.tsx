import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, Tabs, message, Spin } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, PhoneOutlined, ToolOutlined } from '@ant-design/icons';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../api/api';
import { homePathForRole } from '../../lib/roleHome';

export default function LoginPage() {
  const { login, register, isAuthenticated, token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => (searchParams.get('tab') === 'register' ? 'register' : 'login'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = searchParams.get('tab') === 'register' ? 'register' : 'login';
    setTab(t);
  }, [searchParams]);

  if (token && !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Загрузка профиля…" />
      </div>
    );
  }

  if (isAuthenticated && user) return <Navigate to={homePathForRole(user.role)} replace />;

  const onTabChange = (key: string) => {
    setTab(key);
    if (key === 'register') setSearchParams({ tab: 'register' }, { replace: true });
    else setSearchParams({}, { replace: true });
  };

  const onLogin = async (v: { email: string; password: string }) => {
    setLoading(true);
    try {
      const me = await login(v.email, v.password);
      navigate(homePathForRole(me.role), { replace: true });
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (v: { name: string; phone: string; email: string; password: string }) => {
    setLoading(true);
    try {
      const me = await register({
        displayName: v.name,
        email: v.email,
        password: v.password,
        phone: v.phone,
      });
      message.success('Регистрация прошла успешно');
      navigate(homePathForRole(me.role), { replace: true });
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fa',
      }}
    >
      <Card style={{ width: 380, borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#1677ff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <ToolOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            PC Doc
          </Typography.Title>
          <Typography.Text type="secondary">Компьютерная мастерская</Typography.Text>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Войдите в систему для продолжения
          </Typography.Text>
        </div>

        <Tabs
          activeKey={tab}
          onChange={onTabChange}
          centered
          items={[
            { key: 'login', label: 'Войти' },
            { key: 'register', label: 'Регистрация' },
          ]}
        />

        {tab === 'login' ? (
          <Form layout="vertical" onFinish={onLogin}>
            <Form.Item name="email" label="Email" rules={[{ required: true }]}>
              <Input prefix={<MailOutlined />} placeholder="example@mail.ru" />
            </Form.Item>
            <Form.Item name="password" label="Пароль" rules={[{ required: true }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Введите пароль" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Войти
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Form layout="vertical" onFinish={onRegister}>
            <Form.Item name="name" label="Имя" rules={[{ required: true }]}>
              <Input prefix={<UserOutlined />} placeholder="Иван Иванов" />
            </Form.Item>
            <Form.Item name="phone" label="Телефон" rules={[{ required: true }]}>
              <Input prefix={<PhoneOutlined />} placeholder="+79000000000" />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input prefix={<MailOutlined />} placeholder="example@mail.ru" />
            </Form.Item>
            <Form.Item name="password" label="Пароль" rules={[{ required: true, min: 6 }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Введите пароль" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Зарегистрироваться
            </Button>
          </Form>
        )}
      </Card>
    </div>
  );
}
