import type { Addr, Exercise, Range } from '../exercises/types';
import { colToLetters, normalizeRange } from '../engine/address';

export const ROW_HEIGHT = 24;
export const HEADER_WIDTH = 40;
export const HEADER_HEIGHT = 24;
export const DEFAULT_COL_WIDTH = 72;

export interface Geometry {
  rows: number;
  cols: number;
  colWidths: number[];
  colOffsets: number[]; // x van elke kolom, excl. rijkop
  totalWidth: number;
  totalHeight: number;
}

/** Excel-kolombreedte (tekens) -> px. */
export function charsToPx(chars: number): number {
  return Math.round(chars * 7 + 8);
}

export function makeGeometry(ex: Exercise | null): Geometry {
  const rows = ex?.sheet.rows ?? 40;
  const cols = ex?.sheet.cols ?? 12;
  const colWidths: number[] = [];
  for (let c = 0; c < cols; c++) {
    const w = ex?.sheet.colWidths?.[colToLetters(c)];
    colWidths.push(w ? charsToPx(w) : DEFAULT_COL_WIDTH);
  }
  const colOffsets: number[] = [];
  let x = 0;
  for (const w of colWidths) {
    colOffsets.push(x);
    x += w;
  }
  return { rows, cols, colWidths, colOffsets, totalWidth: x, totalHeight: rows * ROW_HEIGHT };
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function cellRect(g: Geometry, a: Addr): Rect {
  return { left: g.colOffsets[a.col], top: a.row * ROW_HEIGHT, width: g.colWidths[a.col], height: ROW_HEIGHT };
}

export function rangeRect(g: Geometry, r: Range): Rect {
  const n = normalizeRange(r);
  const a = cellRect(g, n.start);
  const b = cellRect(g, n.end);
  return { left: a.left, top: a.top, width: b.left + b.width - a.left, height: b.top + b.height - a.top };
}
