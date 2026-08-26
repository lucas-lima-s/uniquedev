export function monthStart(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function splitMonth(month: string): { year: number; monthIndex: number } {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number, number];
  return { year, monthIndex: monthNumber };
}

export function daysInMonth(month: string): number {
  const { year, monthIndex } = splitMonth(month);
  return new Date(year, monthIndex, 0).getDate();
}

export function monthEnd(month: string): string {
  return `${month.slice(0, 7)}-${String(daysInMonth(month)).padStart(2, "0")}`;
}

export function dateInMonth(month: string, day: number): string {
  const clamped = Math.min(Math.max(day, 1), daysInMonth(month));
  return `${month.slice(0, 7)}-${String(clamped).padStart(2, "0")}`;
}

export function addMonths(month: string, delta: number): string {
  const { year, monthIndex } = splitMonth(month);
  return monthStart(new Date(year, monthIndex - 1 + delta, 1));
}

export function monthOf(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function monthLabel(month: string, locale = "pt-BR"): string {
  const { year, monthIndex } = splitMonth(month);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    new Date(year, monthIndex - 1, 1),
  );
}
