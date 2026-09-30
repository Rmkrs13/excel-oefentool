/** Excel 1900-datumsysteem met nullDate 30/12/1899: serieel 42625 = 12/09/2016. */
const EPOCH_MS = Date.UTC(1899, 11, 30);
const DAY_MS = 86400000;

export function serialToDate(serial: number): Date {
  return new Date(EPOCH_MS + Math.floor(serial) * DAY_MS);
}

export function dateToSerial(year: number, month: number, day: number): number {
  return Math.round((Date.UTC(year, month - 1, day) - EPOCH_MS) / DAY_MS);
}

export function formatDateSerial(serial: number): string {
  const d = serialToDate(serial);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

const DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/;

/** 'dd/mm/jjjj' of 'dd/mm/jj' -> serieel, of null als het geen geldige datum is. */
export function parseDateText(text: string): number | null {
  const m = DATE_RE.exec(text.trim());
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  let year = parseInt(m[3], 10);
  if (m[3].length === 2) year += year < 30 ? 2000 : 1900;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const serial = dateToSerial(year, month, day);
  const back = serialToDate(serial);
  if (back.getUTCMonth() + 1 !== month || back.getUTCDate() !== day) return null;
  return serial;
}
