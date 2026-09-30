import type { A1, CellData, CheckContext, DisplayValue } from '../exercises/types';
import type { SheetEngine } from '../engine/engine';
import { parseA1 } from '../engine/address';
import { canonicalFormula } from './formulaUtils';

/** Bouwt de leescontext waar de checks op werken. */
export function makeCheckContext(cells: Record<A1, CellData>, values: Record<A1, DisplayValue>, engine: SheetEngine): CheckContext {
  const raw = (a1: A1) => cells[a1]?.raw ?? '';
  return {
    raw,
    value: (a1) => values[a1]?.value ?? null,
    isError: (a1) => !!values[a1]?.error,
    errorText: (a1) => values[a1]?.error?.text ?? null,
    formula: (a1) => {
      const r = raw(a1);
      return r.startsWith('=') && r.length > 1 ? canonicalFormula(r) : null;
    },
    format: (a1) => cells[a1]?.format,
    isText: (a1) => typeof values[a1]?.value === 'string',
    expectedFill: (anchor, formula, target) => engine.shiftFormula(parseA1(anchor), formula, parseA1(target)),
  };
}
