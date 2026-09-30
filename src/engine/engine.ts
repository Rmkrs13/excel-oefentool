import { DetailedCellError, type HyperFormula, type RawCellContent, type SimpleCellAddress } from 'hyperformula';
import type { A1, Addr, CellData, DisplayValue, Range } from '../exercises/types';
import { buildEngine } from './hf';
import { normalizeRange, rangeSize, toA1 } from './address';
import { parseUserInput } from './parseInput';

/** Zet de ruwe celtekst om naar wat HyperFormula moet opslaan. */
export function rawToContent(cell: CellData | undefined): RawCellContent {
  if (!cell || cell.raw === '') return null;
  const p = parseUserInput(cell.raw, cell.format);
  switch (p.kind) {
    case 'empty':
      return null;
    case 'formula':
      return p.text;
    case 'number':
      return p.value;
    case 'text':
      // Voorloop-apostrof: HyperFormula slaat de rest op als tekst, zonder herinterpretatie.
      return `'${p.value}`;
  }
}

export interface EngineChange {
  a1: A1;
  value: DisplayValue;
}

/**
 * Dunne wrapper rond één HyperFormula-instantie met één werkblad.
 * Alle adressen zijn 0-based {row, col}; de conversie naar HF gebeurt hier.
 */
export class SheetEngine {
  readonly hf: HyperFormula;
  readonly sheetId: number;

  constructor() {
    const built = buildEngine();
    this.hf = built.hf;
    this.sheetId = built.sheetId;
  }

  private addr(a: Addr): SimpleCellAddress {
    return { sheet: this.sheetId, row: a.row, col: a.col };
  }

  destroy(): void {
    this.hf.destroy();
  }

  /** Vervangt de volledige inhoud van het blad. */
  load(cells: Record<A1, CellData>, rows: number, cols: number): Record<A1, DisplayValue> {
    const grid: RawCellContent[][] = [];
    for (let r = 0; r < rows; r++) grid.push(new Array<RawCellContent>(cols).fill(null));
    for (const [a1, cell] of Object.entries(cells)) {
      const { row, col } = parseA1Safe(a1);
      if (row < rows && col < cols) grid[row][col] = rawToContent(cell);
    }
    this.hf.setSheetContent(this.sheetId, grid);
    const values: Record<A1, DisplayValue> = {};
    for (const a1 of Object.keys(cells)) values[a1] = this.getValue(parseA1Safe(a1));
    return values;
  }

  /** Schrijft meerdere cellen in één batch en geeft alle herberekende waarden terug. */
  setCells(patches: Array<{ addr: Addr; cell: CellData | undefined }>): EngineChange[] {
    const changes = this.hf.batch(() => {
      for (const p of patches) this.hf.setCellContents(this.addr(p.addr), rawToContent(p.cell));
    });
    const out: EngineChange[] = [];
    const seen = new Set<string>();
    for (const c of changes) {
      if (!('address' in c) || c.address.sheet !== this.sheetId) continue;
      const a = { row: c.address.row, col: c.address.col };
      const a1 = toA1(a);
      if (seen.has(a1)) continue;
      seen.add(a1);
      out.push({ a1, value: this.getValue(a) });
    }
    for (const p of patches) {
      const a1 = toA1(p.addr);
      if (!seen.has(a1)) out.push({ a1, value: this.getValue(p.addr) });
    }
    return out;
  }

  getValue(a: Addr): DisplayValue {
    const v = this.hf.getCellValue(this.addr(a));
    if (v instanceof DetailedCellError) {
      return { value: null, error: { type: v.type, text: v.value } };
    }
    const detailedType = this.hf.getCellValueDetailedType(this.addr(a));
    return { value: v === undefined ? null : v, detailedType };
  }

  /** Formule zoals HF ze bewaart, of undefined als de cel geen formule bevat. */
  getFormula(a: Addr): string | undefined {
    return this.hf.getCellFormula(this.addr(a));
  }

  validateFormula(text: string): boolean {
    return this.hf.validateFormula(text);
  }

  /**
   * Doortrekken (vulgreep) van formules: geeft per doelcel de nieuwe inhoud.
   * Gebruikt HyperFormula's getFillRangeData, dat relatieve verwijzingen verschuift.
   */
  fillRangeData(source: Range, target: Range): RawCellContent[][] {
    const s = normalizeRange(source);
    const t = normalizeRange(target);
    return this.hf.getFillRangeData(
      { start: this.addr(s.start), end: this.addr(s.end) },
      { start: this.addr(t.start), end: this.addr(t.end) },
    );
  }

  /** Verschuift één formule van `anchor` naar `target` alsof ze werd doorgetrokken. */
  shiftFormula(anchor: Addr, formula: string, target: Addr): string {
    // Gebruik een tijdelijk blad zodat de echte data niet wijzigt.
    const name = this.hf.addSheet();
    const sid = this.hf.getSheetId(name)!;
    try {
      this.hf.setCellContents({ sheet: sid, row: anchor.row, col: anchor.col }, formula);
      const range = {
        start: { sheet: sid, row: Math.min(anchor.row, target.row), col: Math.min(anchor.col, target.col) },
        end: { sheet: sid, row: Math.max(anchor.row, target.row), col: Math.max(anchor.col, target.col) },
      };
      const data = this.hf.getFillRangeData(
        { start: { sheet: sid, row: anchor.row, col: anchor.col }, end: { sheet: sid, row: anchor.row, col: anchor.col } },
        range,
      );
      const r = target.row - range.start.row;
      const c = target.col - range.start.col;
      const v = data[r]?.[c];
      return typeof v === 'string' ? v : '';
    } finally {
      this.hf.removeSheet(sid);
    }
  }

  static sizeOf(r: Range) {
    return rangeSize(r);
  }
}

function parseA1Safe(a1: string): Addr {
  // lokale import vermijden van circulaire types; eenvoudige parser
  const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(a1);
  if (!m) throw new Error(`Ongeldig celadres: ${a1}`);
  let n = 0;
  for (const ch of m[1].toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return { row: parseInt(m[2], 10) - 1, col: n - 1 };
}
