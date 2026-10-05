import { DetailedCellError, type HyperFormula, type RawCellContent, type SimpleCellAddress } from 'hyperformula';
import type { A1, Addr, CellData, DisplayValue, Range, SheetDef } from '../exercises/types';
import { buildEngine } from './hf';
import { normalizeRange, parseA1, toA1 } from './address';
import { parseUserInput } from './parseInput';

/**
 * Excel kent WAAR/ONWAAR als losse waarden; HyperFormula alleen als functie WAAR()/ONWAAR().
 * Zet losse WAAR/ONWAAR (buiten strings, niet gevolgd door '(') om, zodat =VERT.ZOEKEN(...;ONWAAR) werkt.
 */
export function prepareFormula(formula: string): string {
  let out = '';
  let inString = false;
  let i = 0;
  while (i < formula.length) {
    const ch = formula[i];
    if (ch === '"') {
      inString = !inString;
      out += ch;
      i++;
      continue;
    }
    if (inString) {
      out += ch;
      i++;
      continue;
    }
    const m = /^(WAAR|ONWAAR)(?![A-Za-z0-9_.(!])/i.exec(formula.slice(i));
    const prev = out[out.length - 1];
    if (m && (prev === undefined || !/[A-Za-z0-9_.'!$]/.test(prev))) {
      out += m[1].toUpperCase() + '()';
      i += m[1].length;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/** Zet de ruwe celtekst om naar wat HyperFormula moet opslaan. */
export function rawToContent(cell: CellData | undefined): RawCellContent {
  if (!cell || cell.raw === '') return null;
  const p = parseUserInput(cell.raw, cell.format);
  switch (p.kind) {
    case 'empty':
      return null;
    case 'formula':
      return prepareFormula(p.text);
    case 'number':
      return p.value;
    case 'text':
      // Voorloop-apostrof: HyperFormula slaat de rest op als tekst, zonder herinterpretatie.
      return `'${p.value}`;
  }
}

export interface EngineChange {
  sheet: string;
  a1: A1;
  value: DisplayValue;
}

export interface SheetCells {
  name: string;
  rows: number;
  cols: number;
  cells: Record<A1, CellData>;
}

/**
 * Dunne wrapper rond één HyperFormula-instantie met meerdere werkbladen.
 * Adressen zijn 0-based {row, col} plus een tabbladnaam; de conversie naar HF gebeurt hier.
 */
export class SheetEngine {
  readonly hf: HyperFormula;
  private ids = new Map<string, number>();
  private names = new Map<number, string>();

  constructor() {
    this.hf = buildEngine().hf;
  }

  private sheetId(name: string): number {
    const id = this.ids.get(name.toLowerCase());
    if (id === undefined) throw new Error(`Onbekend tabblad: ${name}`);
    return id;
  }

  private addr(sheet: string, a: Addr): SimpleCellAddress {
    return { sheet: this.sheetId(sheet), row: a.row, col: a.col };
  }

  destroy(): void {
    this.hf.destroy();
  }

  sheetNames(): string[] {
    return [...this.names.values()];
  }

  /** Vervangt alle tabbladen en hun inhoud. */
  load(sheets: SheetCells[]): Record<string, Record<A1, DisplayValue>> {
    for (const name of this.hf.getSheetNames()) this.hf.removeSheet(this.hf.getSheetId(name)!);
    this.ids.clear();
    this.names.clear();
    for (const sh of sheets) {
      const name = this.hf.addSheet(sh.name);
      const id = this.hf.getSheetId(name)!;
      this.ids.set(sh.name.toLowerCase(), id);
      this.names.set(id, sh.name);
    }
    for (const sh of sheets) {
      const grid: RawCellContent[][] = [];
      for (let r = 0; r < sh.rows; r++) grid.push(new Array<RawCellContent>(sh.cols).fill(null));
      for (const [a1, cell] of Object.entries(sh.cells)) {
        const { row, col } = parseA1(a1);
        if (row < sh.rows && col < sh.cols) grid[row][col] = rawToContent(cell);
      }
      this.hf.setSheetContent(this.sheetId(sh.name), grid);
    }
    const values: Record<string, Record<A1, DisplayValue>> = {};
    for (const sh of sheets) {
      values[sh.name] = {};
      for (const a1 of Object.keys(sh.cells)) values[sh.name][a1] = this.getValue(sh.name, parseA1(a1));
    }
    return values;
  }

  /** Schrijft meerdere cellen in één batch en geeft alle herberekende waarden terug. */
  setCells(patches: Array<{ sheet: string; addr: Addr; cell: CellData | undefined }>): EngineChange[] {
    const changes = this.hf.batch(() => {
      for (const p of patches) this.hf.setCellContents(this.addr(p.sheet, p.addr), rawToContent(p.cell));
    });
    const out: EngineChange[] = [];
    const seen = new Set<string>();
    for (const c of changes) {
      if (!('address' in c)) continue;
      const sheet = this.names.get(c.address.sheet);
      if (!sheet) continue;
      const a = { row: c.address.row, col: c.address.col };
      const key = `${sheet}!${toA1(a)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ sheet, a1: toA1(a), value: this.getValue(sheet, a) });
    }
    for (const p of patches) {
      const key = `${p.sheet}!${toA1(p.addr)}`;
      if (!seen.has(key)) out.push({ sheet: p.sheet, a1: toA1(p.addr), value: this.getValue(p.sheet, p.addr) });
    }
    return out;
  }

  getValue(sheet: string, a: Addr): DisplayValue {
    const v = this.hf.getCellValue(this.addr(sheet, a));
    if (v instanceof DetailedCellError) {
      return { value: null, error: { type: v.type, text: v.value } };
    }
    const detailedType = this.hf.getCellValueDetailedType(this.addr(sheet, a));
    return { value: v === undefined ? null : v, detailedType };
  }

  getFormula(sheet: string, a: Addr): string | undefined {
    return this.hf.getCellFormula(this.addr(sheet, a));
  }

  validateFormula(text: string): boolean {
    return this.hf.validateFormula(prepareFormula(text));
  }

  /** Doortrekken (vulgreep) van formules: geeft per doelcel de nieuwe inhoud. */
  fillRangeData(sheet: string, source: Range, target: Range): RawCellContent[][] {
    const s = normalizeRange(source);
    const t = normalizeRange(target);
    return this.hf.getFillRangeData(
      { start: this.addr(sheet, s.start), end: this.addr(sheet, s.end) },
      { start: this.addr(sheet, t.start), end: this.addr(sheet, t.end) },
    );
  }

  /** Verschuift één formule van `anchor` naar `target` alsof ze werd doorgetrokken (op een tijdelijk blad). */
  shiftFormula(anchor: Addr, formula: string, target: Addr): string {
    const name = this.hf.addSheet();
    const sid = this.hf.getSheetId(name)!;
    try {
      this.hf.setCellContents({ sheet: sid, row: anchor.row, col: anchor.col }, prepareFormula(formula));
      const range = {
        start: { sheet: sid, row: Math.min(anchor.row, target.row), col: Math.min(anchor.col, target.col) },
        end: { sheet: sid, row: Math.max(anchor.row, target.row), col: Math.max(anchor.col, target.col) },
      };
      const data = this.hf.getFillRangeData(
        { start: { sheet: sid, row: anchor.row, col: anchor.col }, end: { sheet: sid, row: anchor.row, col: anchor.col } },
        range,
      );
      const v = data[target.row - range.start.row]?.[target.col - range.start.col];
      return typeof v === 'string' ? v.replace(/\b(WAAR|ONWAAR)\(\)/g, '$1') : '';
    } finally {
      this.hf.removeSheet(sid);
    }
  }
}

export function sheetDefsToCells(defs: SheetDef[]): SheetCells[] {
  return defs.map((d) => ({ name: d.name, rows: d.rows, cols: d.cols, cells: d.cells }));
}
