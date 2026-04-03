import { Layout, Menu, Avatar, Typography, Button, Space, Tag } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  PlusOutlined,
  TeamOutlined,
  ShoppingOutlined,
  DollarOutlined,
  ToolOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { AppRole } from '../api/api';

const { Header, Sider, Content } = Layout;

function menuItems(role: AppRole | null) {
  if (role === 'client')
    return [
      { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
      { key: '/tickets', icon: <FileTextOutlined />, label: 'Мои заявки' },
      { key: '/tickets/new', icon: <PlusOutlined />, label: 'Создать заявку' },
    ];
  if (role === 'master')
    return [
      { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
      { key: '/tickets', icon: <FileTextOutlined />, label: 'Заявки' },
      { key: '/stock', icon: <ShoppingOutlined />, label: 'Склад' },
    ];
  if (role === 'admin')
    return [
      { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
      { key: '/users', icon: <TeamOutlined />, label: 'Пользователи' },
      { key: '/tickets', icon: <FileTextOutlined />, label: 'Заявки' },
      { key: '/finance', icon: <DollarOutlined />, label: 'Финансы' },
    ];
  return [];
}

const roleLabel: Record<AppRole, string> = {
  client: 'Клиент',
  master: 'Мастер',
  admin: 'Администратор',
};

export default function AppLayout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const items = menuItems(role);
  const sortedKeys = [...items].sort((a, b) => b.key.length - a.key.length);
  const selected =
    sortedKeys.find(i => location.pathname === i.key || location.pathname.startsWith(`${i.key}/`))?.key ?? '';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 24px',
        }}
      >
        <Space>
          <ToolOutlined style={{ fontSize: 20, color: '#1677ff' }} />
          <Typography.Text strong style={{ fontSize: 16 }}>
            PC Doc
          </Typography.Text>
        </Space>
        <Space>
          <Tag>{role ? roleLabel[role] : ''}</Tag>
          <Avatar icon={<UserOutlined />} style={{ background: '#1677ff' }} />
          <Typography.Text>{user?.displayName}</Typography.Text>
          <Button type="text" icon={<LogoutOutlined />} onClick={logout} />
        </Space>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <Menu
            mode="inline"
            selectedKeys={[selected]}
            items={items}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Content style={{ padding: 24, background: '#f5f7fa', minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
