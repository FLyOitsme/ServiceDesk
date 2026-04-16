import { Button, Card, Col, Form, Row, Select, Typography, Upload, Input, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiDeviceTypes, apiManufacturers, apiModels, apiTicketCreate } from '../../api/api';
import PageLoading from '../../components/PageLoading';
import { useState } from 'react';

export default function CreateTicket() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const deviceTypeId = Form.useWatch('deviceTypeId', form);
  const manufacturerId = Form.useWatch('manufacturerId', form);

  const [manufacturers, setManufacturers] = useState<{ id: number; name: string }[]>([]);
  const [models, setModels] = useState<{ id: number; name: string }[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const typesQ = useQuery({
    queryKey: ['ref', 'device-types'],
    queryFn: apiDeviceTypes,
  });

  const loadManufacturers = async (dtId: number) => {
    const list = await apiManufacturers(dtId);
    setManufacturers(list);
    setModels([]);
    form.setFieldsValue({ manufacturerId: undefined, deviceModelId: undefined });
  };

  const loadModels = async (mId: number) => {
    const list = await apiModels(mId);
    setModels(list);
    form.setFieldsValue({ deviceModelId: undefined });
  };

  const create = useMutation({
    mutationFn: (fd: FormData) => apiTicketCreate(fd),
    onSuccess: res => {
      message.success(`Заявка ${res.publicNumber} создана`);
      navigate(`/tickets/${encodeURIComponent(res.publicNumber)}`);
    },
    onError: (e: Error) => message.error(e.message),
  });

  if (typesQ.isLoading) return <PageLoading tip="Загрузка…" />;

  const onFinish = (v: {
    deviceTypeId: number;
    manufacturerId: number;
    deviceModelId: number;
    description: string;
  }) => {
    const fd = new FormData();
    fd.append('deviceTypeId', String(v.deviceTypeId));
    fd.append('manufacturerId', String(v.manufacturerId));
    fd.append('deviceModelId', String(v.deviceModelId));
    fd.append('description', v.description);
    if (file) fd.append('image', file);
    create.mutate(fd);
  };

  return (
    <>
      <Typography.Title level={3}>Создать заявку</Typography.Title>
      <Card style={{ maxWidth: 900 }}>
        <Row gutter={24}>
          <Col xs={24} md={14}>
            <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 560 }}>
              <Form.Item
                name="deviceTypeId"
                label="Тип устройства"
                rules={[{ required: true, message: 'Выберите тип' }]}
              >
                <Select
                  placeholder="Выберите тип устройства"
                  options={typesQ.data?.map(t => ({ value: t.id, label: t.name }))}
                  onChange={(id: number) => loadManufacturers(id)}
                />
              </Form.Item>
              <Form.Item
                name="manufacturerId"
                label="Производитель"
                rules={[{ required: true, message: 'Выберите производителя' }]}
              >
                <Select
                  placeholder="Выберите производителя"
                  disabled={!deviceTypeId}
                  options={manufacturers.map(m => ({ value: m.id, label: m.name }))}
                  onChange={(id: number) => loadModels(id)}
                />
              </Form.Item>
              <Form.Item
                name="deviceModelId"
                label="Модель"
                rules={[{ required: true, message: 'Выберите модель' }]}
              >
                <Select
                  placeholder="Выберите модель"
                  disabled={!manufacturerId}
                  options={models.map(m => ({ value: m.id, label: m.name }))}
                />
              </Form.Item>
              <Form.Item
                name="description"
                label="Описание"
                rules={[{ required: true, min: 3, message: 'Опишите проблему' }]}
              >
                <Input.TextArea rows={5} placeholder="Опишите проблему" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={create.isPending}>
                  Создать
                </Button>
                <Button style={{ marginLeft: 8 }} onClick={() => navigate('/tickets')}>
                  Отмена
                </Button>
              </Form.Item>
            </Form>
          </Col>
          <Col xs={24} md={10}>
            <Typography.Text type="secondary">Фото устройства</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Upload
                listType="picture-card"
                maxCount={1}
                beforeUpload={f => {
                  setFile(f);
                  return false;
                }}
                onRemove={() => setFile(null)}
              >
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Upload</div>
                </div>
              </Upload>
            </div>
          </Col>
        </Row>
      </Card>
    </>
  );
}
