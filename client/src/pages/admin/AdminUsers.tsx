import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiUsers, apiUsersStats, apiUserUpdate, apiUserDelete, type AdminUserRow } from '../../api/api';
import PageLoading from '../../components/PageLoading';
import PageError from '../../components/PageError';
import { RoleBadge } from '../../components/TicketBadges';

export default function AdminUsers() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<AdminUserRow | null>(null);
  const [view, setView] = useState<AdminUserRow | null>(null);
  const [form] = Form.useForm();

  const statsQ = useQuery({
    queryKey: ['users', 'stats'],
    queryFn: apiUsersStats,
  });

  const usersQ = useQuery({
    queryKey: ['users'],
    queryFn: apiUsers,
  });

  const update = useMutation({
    mutationFn: (v: { id: string; displayName: string; email: string; role: string }) =>
      apiUserUpdate(v.id, { displayName: v.displayName, email: v.email, role: v.role }),
    onSuccess: async () => {
      message.success('Сохранено');
      setEdit(null);
      await qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiUserDelete(id),
    onSuccess: async () => {
      message.success('Пользователь удалён');
      await qc.invalidateQueries({ queryKey: ['users'] });
      await qc.invalidateQueries({ queryKey: ['users', 'stats'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  if (usersQ.isLoading || statsQ.isLoading) return <PageLoading tip="Загрузка…" />;
  if (usersQ.isError) return <PageError message={(usersQ.error as Error).message} />;
  if (statsQ.isError) return <PageError message={(statsQ.error as Error).message} />;

  const st = statsQ.data!;
  const rows = usersQ.data!;

  const openEdit = (u: AdminUserRow) => {
    setEdit(u);
    form.setFieldsValue({
      displayName: u.displayName,
      email: u.email,
      role: u.role.toLowerCase(),
    });
  };

  return (
    <>
      <Typography.Title level={3}>Управление пользователями</Typography.Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ background: '#e6f4ff' }}>
            <Typography.Text type="secondary">Клиенты</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0, color: '#1677ff' }}>
              {st.clients}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: '#f6ffed' }}>
            <Typography.Text type="secondary">Мастера</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0, color: '#52c41a' }}>
              {st.masters}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: '#fff7e6' }}>
            <Typography.Text type="secondary">Администраторы</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0, color: '#fa8c16' }}>
              {st.admins}
            </Typography.Title>
          </Card>
        </Col>
      </Row>

      <Table
        rowKey="id"
        dataSource={rows}
        pagination={false}
        columns={[
          {
            title: 'Пользователь',
            render: (_, u) => (
              <div>
                <Typography.Text strong>{u.displayName}</Typography.Text>
                <br />
                <Typography.Text type="secondary">{u.email}</Typography.Text>
              </div>
            ),
          },
          {
            title: 'Роль',
            dataIndex: 'role',
            render: (r: string) => <RoleBadge role={r} />,
          },
          {
            title: 'Статус',
            dataIndex: 'active',
            render: (a: boolean) => (a ? <Tag color="success">Активен</Tag> : <Tag>—</Tag>),
          },
          {
            title: 'ID',
            dataIndex: 'id',
            ellipsis: true,
            width: 200,
          },
          {
            title: 'Действия',
            width: 260,
            render: (_, u) => (
              <>
                <Button type="link" size="small" onClick={() => setView(u)}>
                  Просмотр
                </Button>
                <Button type="link" size="small" onClick={() => openEdit(u)}>
                  Редактировать
                </Button>
                <Button
                  type="link"
                  size="small"
                  danger
                  onClick={() =>
                    Modal.confirm({
                      title: 'Удалить пользователя?',
                      okText: 'Удалить',
                      okType: 'danger',
                      cancelText: 'Отмена',
                      onOk: () => del.mutateAsync(u.id),
                    })
                  }
                >
                  Удалить
                </Button>
              </>
            ),
          },
        ]}
      />

      <Modal
        title="Пользователь"
        open={view != null}
        onCancel={() => setView(null)}
        footer={[
          <Button key="close" onClick={() => setView(null)}>
            Закрыть
          </Button>,
          <Button
            key="edit"
            type="primary"
            onClick={() => {
              if (view) {
                openEdit(view);
                setView(null);
              }
            }}
          >
            Редактировать
          </Button>,
        ]}
        width={560}
      >
        {view && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Имя">{view.displayName}</Descriptions.Item>
            <Descriptions.Item label="Email">{view.email}</Descriptions.Item>
            <Descriptions.Item label="Роль">
              <RoleBadge role={view.role} />
            </Descriptions.Item>
            <Descriptions.Item label="Статус">
              {view.active ? <Tag color="success">Активен</Tag> : <Tag>Неактивен</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="ID (GUID)">
              <Typography.Text copyable>{view.id}</Typography.Text>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="Редактировать пользователя"
        open={edit != null}
        onCancel={() => setEdit(null)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={v =>
            edit &&
            update.mutate({
              id: edit.id,
              displayName: v.displayName,
              email: v.email,
              role: v.role,
            })
          }
        >
          <Form.Item name="displayName" label="Имя" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'client', label: 'Клиент' },
                { value: 'master', label: 'Мастер' },
                { value: 'admin', label: 'Администратор' },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={update.isPending}>
              Сохранить
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
