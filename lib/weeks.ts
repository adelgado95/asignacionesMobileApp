// Pure date helpers for week navigation (Monday to Sunday). Native Date only, local time.
// Days are moved with setDate so daylight-saving changes never shift a week by an hour.

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
export const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Monday (00:00) of the week that contains `date`. */
export function getWeekStart(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** The Monday `n` weeks after (or before, if negative) `weekStart`. */
export function addWeeks(weekStart: Date, n: number): Date {
  const d = startOfDay(weekStart);
  d.setDate(d.getDate() + 7 * n);
  return d;
}

/** Sunday of the week that starts on `weekStart`. */
export function getWeekEnd(weekStart: Date): Date {
  const d = startOfDay(weekStart);
  d.setDate(d.getDate() + 6);
  return d;
}

/**
 * "9 – 15 de noviembre", or "30 nov – 6 dic" when the week crosses a month
 * (and "28 dic – 3 ene" when it crosses a year).
 */
export function formatWeekRange(weekStart: Date): string {
  const a = startOfDay(weekStart);
  const b = getWeekEnd(a);
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${b.getDate()} de ${MESES[b.getMonth()]}`;
  return `${a.getDate()} ${MESES_CORTO[a.getMonth()]} – ${b.getDate()} ${MESES_CORTO[b.getMonth()]}`;
}

/** First Monday of a month (month is 1-12): the week the selector jumps to when the month changes. */
export function firstWeekOfMonth(year: number, month: number): Date {
  const first = new Date(year, month - 1, 1);
  const monday = getWeekStart(first);
  return monday.getTime() === first.getTime() ? monday : addWeeks(monday, 1);
}

/** Month (1-12) and year a week belongs to: those of its Monday. */
export function monthOfWeek(weekStart: Date): { month: number; year: number } {
  return { month: weekStart.getMonth() + 1, year: weekStart.getFullYear() };
}

export type WeekRelation = 'actual' | 'pasada' | 'proxima' | null;

/** How `weekStart` relates to the week that contains `now`. */
export function relationToNow(weekStart: Date, now: Date = new Date()): WeekRelation {
  const diff = Math.round((startOfDay(weekStart).getTime() - getWeekStart(now).getTime()) / (7 * 24 * 3600 * 1000));
  if (diff === 0) return 'actual';
  if (diff === -1) return 'pasada';
  if (diff === 1) return 'proxima';
  return null;
}

export const RELATION_LABEL: Record<Exclude<WeekRelation, null>, string> = {
  actual: 'Semana actual',
  pasada: 'Semana pasada',
  proxima: 'Próxima semana',
};

/** "2026-11-09", the format the backend uses for `fecha_inicio`. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
