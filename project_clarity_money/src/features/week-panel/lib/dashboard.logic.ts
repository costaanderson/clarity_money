function startOfWeek(d = new Date()) {
  const day = d.getDay(); // 0 = domingo
  const diff = day === 0 ? -6 : 1 - day; // começa na segunda
  const s = new Date(d);
  s.setDate(d.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

export function getWeekRange(offset: number): { weekStart: Date; weekEnd: Date } {
  const base = startOfWeek();
  base.setDate(base.getDate() + offset * 7);
  const weekEnd = new Date(base);
  weekEnd.setDate(base.getDate() + 7);
  return { weekStart: base, weekEnd };
}
