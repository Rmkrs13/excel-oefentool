import type { A1, CellData, CheckContext, DisplayValue } from '../exercises/types';
import type { SheetEngine } from '../engine/engine';
import { parseA1, splitSheetRef } from '../engine/address';
import { canonicalFormula } from './formulaUtils';

export type SheetsCells = Record<string, Record<A1, CellData>>;
export type SheetsValues = Record<string, Record<A1, DisplayValue>>;

/** Zoekt een tabblad hoofdletterongevoelig op. */
export function findSheetKey<T>(map: Record<string, T>, name: string): string | undefined {
  if (name in map) return name;
  const lower = name.toLowerCase();
  return Object.keys(map).find((k) => k.toLowerCase() === lower);
}

/** Bouwt de leescontext waar de checks op werken. Verwijzingen zonder tabblad slaan op `defaultSheet`. */
export function makeCheckContext(sheets: SheetsCells, values: SheetsValues, engine: SheetEngine, defaultSheet: string): CheckContext {
  const cellOf = (ref: string): CellData | undefined => {
    const { sheet, ref: a1 } = splitSheetRef(ref, defaultSheet);
    const key = findSheetKey(sheets, sheet);
    return key ? sheets[key]?.[a1] : undefined;
  };
  const valueOf = (ref: string): DisplayValue | undefined => {
    const { sheet, ref: a1 } = splitSheetRef(ref, defaultSheet);
    const key = findSheetKey(values, sheet);
    return key ? values[key]?.[a1] : undefined;
  };
  const raw = (ref: string) => cellOf(ref)?.raw ?? '';
  return {
    raw,
    value: (ref) => valueOf(ref)?.value ?? null,
    isError: (ref) => !!valueOf(ref)?.error,
    errorText: (ref) => valueOf(ref)?.error?.text ?? null,
    formula: (ref) => {
      const r = raw(ref);
      return r.startsWith('=') && r.length > 1 ? canonicalFormula(r) : null;
    },
    format: (ref) => cellOf(ref)?.format,
    isText: (ref) => typeof valueOf(ref)?.value === 'string',
    expectedFill: (anchor, formula, target) => {
      const a = splitSheetRef(anchor, defaultSheet).ref;
      const t = splitSheetRef(target, defaultSheet).ref;
      return engine.shiftFormula(parseA1(a), formula, parseA1(t));
    },
  };
}
