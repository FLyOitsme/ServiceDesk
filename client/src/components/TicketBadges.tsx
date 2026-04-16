import { Tag } from 'antd';
import { priorityLabel, statusLabel } from '../lib/ticketLabels';

const statusColors: Record<string, string> = {
  New: 'default',
  Diagnostics: 'processing',
  InProgress: 'blue',
  WaitingParts: 'warning',
  Ready: 'success',
  Completed: 'success',
};

const priorityColors: Record<string, string> = {
  Low: 'default',
  Normal: 'blue',
  High: 'orange',
  Urgent: 'red',
};

export function StatusBadge({ status }: { status: string }) {
  const label = statusLabel[status] ?? status;
  const color = statusColors[status] ?? 'default';
  return <Tag color={color}>{label}</Tag>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const label = priorityLabel[priority] ?? priority;
  const color = priorityColors[priority] ?? 'default';
  return <Tag color={color}>{label}</Tag>;
}

export function RoleBadge({ role }: { role: string }) {
  const r = role.toLowerCase();
  const map: Record<string, { color: string; label: string }> = {
    client: { color: 'blue', label: 'Клиент' },
    master: { color: 'green', label: 'Мастер' },
    admin: { color: 'orange', label: 'Администратор' },
  };
  const m = map[r] ?? { color: 'default', label: role };
  return <Tag color={m.color}>{m.label}</Tag>;
}
