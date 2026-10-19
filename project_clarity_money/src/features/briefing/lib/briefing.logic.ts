/**
 * Calcula quantos dias faltam para a próxima ocorrência de uma data recorrente (mês/dia).
 * Verifica o ano atual e o próximo para cobrir viradas de ano.
 * Retorna null se a data não cair nos próximos DAYS_AHEAD dias.
 */
export function daysUntilNextOccurrence(
  month: number,
  day: number,
  today = new Date(),
  daysAhead = 7,
): number | null {
  const base = new Date(today);
  base.setHours(0, 0, 0, 0);
  const yr = base.getFullYear();

  for (const y of [yr, yr + 1]) {
    const ev = new Date(y, month - 1, day);
    ev.setHours(0, 0, 0, 0);
    const diff = Math.floor((ev.getTime() - base.getTime()) / 86_400_000);
    if (diff >= 0 && diff <= daysAhead) return diff;
  }

  return null;
}
