/**
 * Converte um valor de input datetime-local para ISO string.
 * Retorna null se o valor estiver vazio ou for uma data inválida.
 */
export function toIsoOrNull(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}
