import { describe, expect, it } from 'vitest';
import { EXERCISES } from './index';
import type { A1, CellData, Exercise } from './types';
import { SheetEngine } from '../engine/engine';
import { parseA1, parseRange, rangeCells, toA1 } from '../engine/address';
import { makeCheckContext } from '../checks/context';
import { runStep } from '../checks/runChecks';
import { parseFormatCode } from '../format/numberFormat';

/** Simuleert een student die de oplossing volledig invult (incl. doortrekken via de engine). */
function solve(ex: Exercise, solution: Record<A1, Partial<CellData>>, fills: Array<{ anchor: A1; formula: string; range: string; format?: string }>) {
  const engine = new SheetEngine();
  const cells: Record<A1, CellData> = structuredClone(ex.sheet.cells);
  for (const [a1, patch] of Object.entries(solution)) cells[a1] = { ...(cells[a1] ?? { raw: '' }), ...patch };
  for (const f of fills) {
    for (const a of rangeCells(parseRange(f.range))) {
      const a1 = toA1(a);
      const raw = engine.shiftFormula(parseA1(f.anchor), f.formula, a);
      cells[a1] = { ...(cells[a1] ?? { raw: '' }), raw, ...(f.format ? { format: parseFormatCode(f.format) } : {}) };
    }
  }
  const values = engine.load(cells, ex.sheet.rows, ex.sheet.cols);
  const ctx = makeCheckContext(cells, values, engine);
  const results = ex.steps.map((s) => ({ id: s.id, r: runStep(s, ctx, (a1) => ex.sheet.cells[a1]?.raw ?? '') }));
  engine.destroy();
  return results;
}

function expectAllOk(results: ReturnType<typeof solve>) {
  const failed = results.filter((x) => !x.r.ok).map((x) => `${x.id}: ${x.r.results.filter((r) => !r.ok).map((r) => r.message).join(' | ')}`);
  expect(failed).toEqual([]);
}

const fmt = (code: string, range: string) => Object.fromEntries(rangeCells(parseRange(range)).map((a) => [toA1(a), { format: parseFormatCode(code) }]));

describe('oefeningen', () => {
  it('hebben unieke ids en stappen', () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of EXERCISES) expect(new Set(e.steps.map((s) => s.id)).size).toBe(e.steps.length);
  });

  it('les1-evaluatie: volledige oplossing is groen, lege start is niet groen', () => {
    const ex = EXERCISES.find((e) => e.id === 'les1-evaluatie')!;
    const empty = solve(ex, {}, []);
    expect(empty.every((x) => !x.r.ok)).toBe(true);
    expect(empty.every((x) => !x.r.touched)).toBe(true);
    const sol: Record<A1, Partial<CellData>> = {
      C21: { raw: '=AANTALARG(B5:B18)' },
      C22: { raw: '=min(D5:F18)' },
      C23: { raw: '=MAX(D5:F18)' },
      ...fmt('0,0', 'D5:F18'),
    };
    for (let i = 3; i <= 14; i++) sol[`A${i + 4}`] = { raw: String(i) };
    expectAllOk(
      solve(ex, sol, [
        { anchor: 'G5', formula: '=SOM(D5:F5)', range: 'G5:G18', format: '0' },
        { anchor: 'D19', formula: '=GEMIDDELDE(D5:D18)', range: 'D19:G19', format: '0,0' },
        { anchor: 'D20', formula: '=MEDIAAN(D5:D18)', range: 'D20:G20', format: '0,0' },
      ]),
    );
  });

  it('abs-rel: volledige oplossing is groen', () => {
    const ex = EXERCISES.find((e) => e.id === 'abs-rel')!;
    expectAllOk(
      solve(ex, { B3: { raw: '=SOM(B5:B8)' } }, [
        { anchor: 'C5', formula: '=B5/$B$3', range: 'C5:C8', format: '0,0%' },
        { anchor: 'H4', formula: '=$G4*H$3', range: 'H4:L8' },
      ]),
    );
    // relatieve verwijzing zonder $ faalt bij doortrekken
    const wrong = solve(ex, { B3: { raw: '=SOM(B5:B8)' } }, [{ anchor: 'C5', formula: '=B5/B3', range: 'C5:C8' }]);
    expect(wrong.find((x) => x.id === 'aandeel')!.r.ok).toBe(false);
  });

  it('functies-nesten: volledige oplossing is groen', () => {
    const ex = EXERCISES.find((e) => e.id === 'functies-nesten')!;
    expectAllOk(solve(ex, { G2: { raw: '=GEMIDDELDE(B2:D5)', format: parseFormatCode('0') }, G4: { raw: '=AFRONDEN(GEMIDDELDE(B2:D5);0)' } }, []));
  });

  it('sport: volledige oplossing is groen', () => {
    const ex = EXERCISES.find((e) => e.id === 'sport')!;
    const maanden = ['oktober', 'november', 'december', 'januari', 'februari', 'maart', 'april', 'mei', 'juni'];
    const sol: Record<A1, Partial<CellData>> = {
      B6: { raw: "'014 12 34 56" },
      B7: { format: parseFormatCode('dd/mm/jjjj') },
      G10: { raw: 'Totaal' },
      ...fmt('€ #.##0,00', 'B30:F30'),
      ...fmt('#.##0', 'B11:F20'),
    };
    maanden.forEach((m, i) => {
      sol[`A${12 + i}`] = { raw: m };
      sol[`A${35 + i}`] = { raw: m };
    });
    expectAllOk(
      solve(ex, sol, [
        { anchor: 'G11', formula: '=SOM(B11:F11)', range: 'G11:G20', format: '#.##0' },
        { anchor: 'B21', formula: '=SOM(B11:B20)', range: 'B21:G21', format: '#.##0' },
        { anchor: 'B23', formula: '=GEMIDDELDE(B11:B20)', range: 'B23:G23' },
        { anchor: 'B24', formula: '=AFRONDEN(GEMIDDELDE(B11:B20);0)', range: 'B24:G24' },
        { anchor: 'B25', formula: '=MEDIAAN(B11:B20)', range: 'B25:G25' },
        { anchor: 'B26', formula: '=MIN(B11:B20)', range: 'B26:G26' },
        { anchor: 'B27', formula: '=MAX(B11:B20)', range: 'B27:G27' },
        { anchor: 'B28', formula: '=B21/$G$21', range: 'B28:G28', format: '0,0%' },
        { anchor: 'B34', formula: '=B11*B$30', range: 'B34:F43', format: '€ #.##0' },
        { anchor: 'G34', formula: '=SOM(B34:F34)', range: 'G34:G43', format: '€ #.##0' },
        { anchor: 'B44', formula: '=SOM(B34:B43)', range: 'B44:G44', format: '€ #.##0' },
      ]),
    );
  });
});
