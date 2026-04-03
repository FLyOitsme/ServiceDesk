import { Alert } from 'antd';

export default function PageValidation({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <Alert
      type="warning"
      message="Проверьте введённые данные"
      description={
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      }
      showIcon
      style={{ marginBottom: 16 }}
    />
  );
}
