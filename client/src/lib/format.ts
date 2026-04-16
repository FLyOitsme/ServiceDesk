/** Дата в формате DD.MM.YYYY (локаль ru). */
export function formatRuDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Сумма в рублях с пробелом как разделителем тысяч. */
export function formatRub(amount: number | null | undefined, empty = '—'): string {
  if (amount == null || Number.isNaN(amount)) return empty;
  const n = Math.round(amount);
  return `${n.toLocaleString('ru-RU')} ₽`;
}

/** Относительное время для ленты активности. */
export function formatRelativeRu(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const days = Math.floor(h / 24);
  return `${days} дн назад`;
}
