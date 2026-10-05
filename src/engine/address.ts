import type { A1, Addr, Range } from '../exercises/types';

export function colToLetters(col: number): string {
  let s = '';
  let n = col + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function lettersToCol(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function toA1(addr: Addr): A1 {
  return `${colToLetters(addr.col)}${addr.row + 1}`;
}

const A1_RE = /^\$?([A-Za-z]{1,3})\$?(\d+)$/;

export function parseA1(a1: A1): Addr {
  const m = A1_RE.exec(a1.trim());
  if (!m) throw new Error(`Ongeldig celadres: ${a1}`);
  return { row: parseInt(m[2], 10) - 1, col: lettersToCol(m[1]) };
}

export function isA1(s: string): boolean {
  return A1_RE.test(s.trim());
}

/** 'B11:F11' of 'B11' -> genormaliseerd bereik. */
export function parseRange(ref: string): Range {
  const [a, b] = ref.split(':');
  const start = parseA1(a);
  const end = b ? parseA1(b) : start;
  return normalizeRange({ start, end });
}

export function normalizeRange(r: Range): Range {
  return {
    start: { row: Math.min(r.start.row, r.end.row), col: Math.min(r.start.col, r.end.col) },
    end: { row: Math.max(r.start.row, r.end.row), col: Math.max(r.start.col, r.end.col) },
  };
}

export function rangeToA1(r: Range): string {
  const n = normalizeRange(r);
  const a = toA1(n.start);
  const b = toA1(n.end);
  return a === b ? a : `${a}:${b}`;
}

export function rangeCells(r: Range): Addr[] {
  const n = normalizeRange(r);
  const out: Addr[] = [];
  for (let row = n.start.row; row <= n.end.row; row++)
    for (let col = n.start.col; col <= n.end.col; col++) out.push({ row, col });
  return out;
}

export function rangeContains(r: Range, a: Addr): boolean {
  const n = normalizeRange(r);
  return a.row >= n.start.row && a.row <= n.end.row && a.col >= n.start.col && a.col <= n.end.col;
}

export function sameAddr(a: Addr, b: Addr): boolean {
  return a.row === b.row && a.col === b.col;
}

export function rangeSize(r: Range): { rows: number; cols: number } {
  const n = normalizeRange(r);
  return { rows: n.end.row - n.start.row + 1, cols: n.end.col - n.start.col + 1 };
}

/** Splitst "'Budget 2024'!B5" of "Blad2!B5:C9" in tabbladnaam en verwijzing. Zonder '!' geldt `defaultSheet`. */
export function splitSheetRef(ref: string, defaultSheet: string): { sheet: string; ref: string } {
  const i = ref.lastIndexOf('!');
  if (i < 0) return { sheet: defaultSheet, ref };
  let sheet = ref.slice(0, i);
  if (sheet.startsWith("'") && sheet.endsWith("'")) sheet = sheet.slice(1, -1).replace(/''/g, "'");
  return { sheet, ref: ref.slice(i + 1) };
}

/** Tabbladnaam zoals ze in een formule moet staan (met aanhalingstekens als dat nodig is). */
export function quoteSheetName(name: string): string {
  return /^[A-Za-z_][A-Za-z0-9_.]*$/.test(name) ? name : `'${name.replace(/'/g, "''")}'`;
}

/** Verwijzing naar `ref` op tabblad `sheet`, gezien vanuit `fromSheet`. */
export function qualifyRef(sheet: string, ref: string, fromSheet: string): string {
  return sheet.toLowerCase() === fromSheet.toLowerCase() ? ref : `${quoteSheetName(sheet)}!${ref}`;
}
