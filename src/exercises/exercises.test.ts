import { describe, expect, it } from 'vitest';
import { EXERCISES } from './index';
import type { A1, CellData, Exercise } from './types';
import { SheetEngine } from '../engine/engine';
import { parseA1, parseRange, rangeCells, splitSheetRef, toA1 } from '../engine/address';
import { makeCheckContext } from '../checks/context';
import { runStep } from '../checks/runChecks';
import { parseFormatCode } from '../format/numberFormat';

/**
 * Simuleert een student die de oplossing volledig invult (incl. doortrekken via de engine).
 * Celverwijzingen mogen een tabblad bevatten ('Totaal!D5'); zonder tabblad geldt het eerste.
 */
export function solve(ex: Exercise, solution: Record<string, Partial<CellData>>, fills: Array<{ anchor: string; formula: string; range: string; format?: string }>) {
  const engine = new SheetEngine();
  const def = ex.sheets[0].name;
  const sheets: Record<string, Record<A1, CellData>> = {};
  for (const d of ex.sheets) sheets[d.name] = structuredClone(d.cells);
  const put = (ref: string, patch: Partial<CellData>) => {
    const { sheet, ref: a1 } = splitSheetRef(ref, def);
    sheets[sheet][a1] = { ...(sheets[sheet][a1] ?? { raw: '' }), ...patch };
  };
  for (const [ref, patch] of Object.entries(solution)) put(ref, patch);
  for (const f of fills) {
    const { sheet, ref: range } = splitSheetRef(f.range, def);
    const anchor = splitSheetRef(f.anchor, def).ref;
    for (const a of rangeCells(parseRange(range))) {
      const raw = engine.shiftFormula(parseA1(anchor), f.formula, a);
      put(`${sheet}!${toA1(a)}`, { raw, ...(f.format ? { format: parseFormatCode(f.format) } : {}) });
    }
  }
  const values = engine.load(ex.sheets.map((d) => ({ name: d.name, rows: d.rows, cols: d.cols, cells: sheets[d.name] })));
  const ctx = makeCheckContext(sheets, values, engine, def);
  const initialRaw = (ref: string) => {
    const { sheet, ref: a1 } = splitSheetRef(ref, def);
    return ex.sheets.find((d) => d.name === sheet)?.cells[a1]?.raw ?? '';
  };
  const results = ex.steps.map((s) => ({ id: s.id, r: runStep(s, ctx, initialRaw) }));
  engine.destroy();
  return results;
}

function expectAllOk(results: ReturnType<typeof solve>) {
  const failed = results.filter((x) => !x.r.ok).map((x) => `${x.id}: ${x.r.results.filter((r) => !r.ok).map((r) => r.message).join(' | ')}`);
  expect(failed).toEqual([]);
}

const fmt = (code: string, range: string) => {
  const i = range.lastIndexOf('!');
  const prefix = i >= 0 ? range.slice(0, i + 1) : '';
  return Object.fromEntries(rangeCells(parseRange(range.slice(i + 1))).map((a) => [prefix + toA1(a), { format: parseFormatCode(code) }]));
};

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

  it('les2-als: volledige oplossing is groen', () => {
    const ex = EXERCISES.find((e) => e.id === 'les2-als')!;
    expectAllOk(
      solve(ex, { C16: { raw: '=AANTAL.ALS(D5:D14;"geslaagd")' } }, [
        { anchor: 'D5', formula: '=ALS(C5>=$C$2;"geslaagd";"niet geslaagd")', range: 'D5:D14' },
        { anchor: 'E5', formula: '=ALS(C5>=2800;1;0)', range: 'E5:E14' },
        { anchor: 'F5', formula: '=ALS(C5<2000;"basis";ALS(C5<2600;"gevorderd";"expert"))', range: 'F5:F14' },
      ]),
    );
  });

  it('les2-zoeken: oplossing is groen, ook met onbekende ploeg', () => {
    const ex = EXERCISES.find((e) => e.id === 'les2-zoeken')!;
    const sol = { C5: { raw: '=X.ZOEKEN(C2;E5:E8;F5:F8)' }, C6: { raw: '=VERT.ZOEKEN(C2;E5:F8;2;ONWAAR)' }, C7: { raw: '=X.ZOEKEN(C2;E5:E8;F5:F8;"niet gevonden")' } };
    // Met een bekende ploeg én met een onbekende ploeg zijn alle stappen groen.
    expectAllOk(solve(ex, { ...sol, C2: { raw: 'Chelsea' } }, []));
    expectAllOk(solve(ex, { ...sol, C2: { raw: 'Ajax' } }, []));
    // Met de startploeg is stap 3 nog niet af; een foute VERT.ZOEKEN (benaderend) valt door de mand bij 'Ajax'.
    const start = solve(ex, sol, []);
    expect(start.find((x) => x.id === 'andere')!.r.ok).toBe(false);
    const fout = solve(ex, { ...sol, C2: { raw: 'Ajax' }, C6: { raw: '=VERT.ZOEKEN(C2;E5:F8;2)' } }, []);
    expect(fout.find((x) => x.id === 'vertzoeken')!.r.ok).toBe(false);
  });

  it('les2-totaal: volledige oplossing is groen', () => {
    const ex = EXERCISES.find((e) => e.id === 'les2-totaal')!;
    expectAllOk(
      solve(ex, { C21: { raw: '=AANTALARG(B5:B18)' }, C22: { raw: '=MIN(D5:F18)' }, C23: { raw: '=MAX(D5:F18)' } }, [
        { anchor: 'D5', formula: '=semester1!D5*0,4+semester2!D5*0,6', range: 'D5:F18' },
        { anchor: 'G5', formula: '=SOM(D5:F5)', range: 'G5:G18' },
        { anchor: 'H5', formula: '=G5/60', range: 'H5:H18', format: '0,0%' },
        { anchor: 'I5', formula: '=ALS(H5<0,5;"onvoldoende";ALS(H5<0,68;"voldoende";ALS(H5<0,78;"onderscheiding";"grote onderscheiding")))', range: 'I5:I18' },
        { anchor: 'J5', formula: '=VERT.ZOEKEN(H5;Graad!$B$3:$C$6;2)', range: 'J5:J18' },
        { anchor: 'K5', formula: '=X.ZOEKEN(B5;VZ!$B$3:$B$16;VZ!$D$3:$D$16)', range: 'K5:K18' },
        { anchor: 'D19', formula: '=GEMIDDELDE(D5:D18)', range: 'D19:G19' },
        { anchor: 'D20', formula: '=MEDIAAN(D5:D18)', range: 'D20:G20' },
      ]),
    );
    // VERT.ZOEKEN-variant voor de woonplaats werkt ook
    const alt = solve(ex, {}, [{ anchor: 'K5', formula: '=VERT.ZOEKEN(B5;VZ!$B$3:$D$16;3;ONWAAR)', range: 'K5:K18' }]);
    expect(alt.find((x) => x.id === 'woonplaats')!.r.ok).toBe(true);
  });
});
