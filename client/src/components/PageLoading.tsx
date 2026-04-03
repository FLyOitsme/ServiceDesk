import { Spin } from 'antd';

export default function PageLoading({ tip }: { tip?: string }) {
  return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <Spin size="large" tip={tip} />
    </div>
  );
}
