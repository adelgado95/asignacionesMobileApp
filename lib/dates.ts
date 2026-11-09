export const MONTHS = [
  { label: 'Enero', value: 1 },
  { label: 'Febrero', value: 2 },
  { label: 'Marzo', value: 3 },
  { label: 'Abril', value: 4 },
  { label: 'Mayo', value: 5 },
  { label: 'Junio', value: 6 },
  { label: 'Julio', value: 7 },
  { label: 'Agosto', value: 8 },
  { label: 'Septiembre', value: 9 },
  { label: 'Octubre', value: 10 },
  { label: 'Noviembre', value: 11 },
  { label: 'Diciembre', value: 12 },
];

export const YEARS = [2024, 2025, 2026];

export const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// ISO dates are parsed by hand so the weekday never shifts with the device time zone.
export const parseDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { day: d, weekday: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], month: MONTHS[m - 1]?.label ?? '' };
};

export const longDate = (iso: string) => {
  const { day, weekday, month } = parseDay(iso);
  return `${weekday} ${day} de ${month.toLowerCase()}`;
};
