/** Метки статусов и приоритетов (значения с API — PascalCase enum names). */

export const statusLabel: Record<string, string> = {
  New: 'Новая',
  Diagnostics: 'Диагностика',
  InProgress: 'В работе',
  WaitingParts: 'Ожидает запчасть',
  Ready: 'Готово',
  Completed: 'Завершено',
};

export const priorityLabel: Record<string, string> = {
  Low: 'Низкий',
  Normal: 'Обычный',
  High: 'Высокий',
  Urgent: 'Срочно',
};

export const activityKindLabel: Record<string, string> = {
  NewTicket: 'Новый',
  TicketCompleted: 'Выполнено',
  Payment: 'Оплата',
  UserRegistered: 'Пользователь',
};

export const txTypeLabel: Record<string, string> = {
  Income: 'Доход',
  Expense: 'Расход',
};

export const txStatusLabel: Record<string, string> = {
  Pending: 'Ожидается',
  Completed: 'Завершено',
};
