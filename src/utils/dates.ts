const SPANISH_MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

export interface ParsedIsoDate {
  year: number;
  month: number;
  day: number;
}

/**
 * Parses a YYYY-MM-DD date string strictly by splitting on '-' to prevent
 * UTC timezone off-by-one shifts caused by `new Date(isoString)`.
 */
export function parseIsoDateStrict(isoDate: string | undefined | null): ParsedIsoDate | null {
  if (!isoDate || typeof isoDate !== 'string') return null;
  const trimmed = isoDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const parts = trimmed.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { year, month, day };
}

/**
 * Formats YYYY-MM-DD into unambiguous Spanish long date: "19 de noviembre de 2026".
 */
export function formatDateLongES(
  isoDate: string | undefined | null,
  fallback = 'Por confirmar',
): string {
  const parsed = parseIsoDateStrict(isoDate);
  if (!parsed) return fallback;
  const monthName = SPANISH_MONTHS[parsed.month - 1];
  return `${parsed.day} de ${monthName} de ${parsed.year}`;
}

/**
 * Formats YYYY-MM-DD into compact numeric DD/MM/AAAA: "19/11/2026".
 */
export function formatDateCompactDMY(
  isoDate: string | undefined | null,
  fallback = 'Sin fecha',
): string {
  const parsed = parseIsoDateStrict(isoDate);
  if (!parsed) return fallback;
  const dd = String(parsed.day).padStart(2, '0');
  const mm = String(parsed.month).padStart(2, '0');
  return `${dd}/${mm}/${parsed.year}`;
}

/**
 * Formats an ISO timestamp (updatedAt) into Dominican local DD/MM/AAAA hh:mm AM/PM.
 */
export function formatTimestampDMY(isoTimestamp: string | undefined | null): string {
  if (!isoTimestamp) return '';
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
  hours = hours % 12 || 12;
  return `${dd}/${mm}/${yyyy} · ${hours}:${minutes} ${ampm}`;
}

/**
 * Returns today's local date in YYYY-MM-DD format without UTC shift.
 */
export function getTodayIsoLocal(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
