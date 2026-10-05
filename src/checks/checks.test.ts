import { describe, expect, it } from 'vitest';
import { SheetEngine } from '../engine/engine';
import type { A1, CellData, DisplayValue } from '../exercises/types';
import { makeCheckContext } from './context';
import { autoCloseParens, canonicalFormula, functionsUsed, hasNested, hasRef } from './formulaUtils';
import { runCheck } from './runChecks';

function build(cells: Record<A1, CellData>, extra: Record<string, Record<A1, CellData>> = {}) {
  const engine = new SheetEngine();
  const sheets = { Blad1: cells, ...extra };
  const values = engine.load(Object.entries(sheets).map(([name, c]) => ({ name, rows: 50, cols: 12, cells: c })));
  return makeCheckContext(sheets, values as Record<string, Record<A1, DisplayValue>>, engine, 'Blad1');
}

describe('formulaUtils', () => {
  it('canonicaliseert', () => {
    expect(canonicalFormula('=som( d5 : f5 )')).toBe('=SOM(D5:F5)');
    expect(canonicalFormula('=ALS(A1="ja ";1;0)')).toBe('=ALS(A1="ja ";1;0)');
    expect(functionsUsed('=AFRONDEN(GEMIDDELDE(B2:D5);0)')).toEqual(['AFRONDEN', 'GEMIDDELDE']);
    expect(hasNested('=AFRONDEN(GEMIDDELDE(B2:D5);0)', 'AFRONDEN', 'GEMIDDELDE')).toBe(true);
    expect(hasNested('=AFRONDEN(B2;0)', 'AFRONDEN', 'GEMIDDELDE')).toBe(false);
    expect(hasNested('=ALS(C5<2000;"basis";ALS(C5<2600;"gevorderd";"expert"))', 'ALS', 'ALS')).toBe(true);
    expect(hasNested('=ALS(C5<2000;"basis";"ander")', 'ALS', 'ALS')).toBe(false);
    expect(hasNested('=AFRONDEN(B2;0)+GEMIDDELDE(B2:B4)', 'AFRONDEN', 'GEMIDDELDE')).toBe(false);
    expect(hasNested('=ALS(A1="ALS(";1;0)', 'ALS', 'ALS')).toBe(false);
    expect(hasRef('=B21/$G$21', '$G$21')).toBe(true);
    expect(hasRef('=B21/G21', '$G$21')).toBe(false);
    expect(hasRef('=B11*B$30', 'B$30')).toBe(true);
  });
});

describe('autoCloseParens', () => {
  it('vult sluithaakjes aan', () => {
    expect(autoCloseParens('=SOM(D5:F5')).toBe('=SOM(D5:F5)');
    expect(autoCloseParens('=AFRONDEN(GEMIDDELDE(B2:D5);0')).toBe('=AFRONDEN(GEMIDDELDE(B2:D5);0)');
    expect(autoCloseParens('=AFRONDEN(GEMIDDELDE(B2:D5')).toBe('=AFRONDEN(GEMIDDELDE(B2:D5))');
    expect(autoCloseParens('=SOM(D5:F5)')).toBe('=SOM(D5:F5)');
    expect(autoCloseParens('=ALS(A1="(";1;0')).toBe('=ALS(A1="(";1;0)');
    expect(autoCloseParens('hallo(')).toBe('hallo(');
  });
});

describe('runCheck', () => {
  it('formula exact en partial', () => {
    const ctx = build({ D5: { raw: '10' }, E5: { raw: '13' }, F5: { raw: '14' }, G5: { raw: '=som(d5:f5)' }, G6: { raw: '=D5+E5+F5' }, G7: { raw: '' } });
    expect(runCheck({ type: 'formula', cell: 'G5', expect: '=SOM(D5:F5)' }, ctx).ok).toBe(true);
    const p = runCheck({ type: 'formula', cell: 'G6', expect: '=SOM(D5:F5)' }, ctx);
    expect(p.ok).toBe(false);
    expect(p.partial).toBe(true);
    expect(runCheck({ type: 'formula', cell: 'G7', expect: '=SOM(D5:F5)' }, ctx).message).toContain('leeg');
    expect(runCheck({ type: 'formula', cell: 'G5', expect: ['=SOM(D5;E5;F5)', '=SOM(D5:F5)'] }, ctx).ok).toBe(true);
  });
  it('value, usesFunction, usesAbsoluteRef, isText, format', () => {
    const ctx = build({
      B2: { raw: '4850' }, C2: { raw: '3890' }, D2: { raw: '4180' },
      G4: { raw: '=AFRONDEN(GEMIDDELDE(B2:D2);0)' },
      B21: { raw: '100' }, G21: { raw: '400' }, B28: { raw: '=B21/$G$21', format: { kind: 'percent', decimals: 1 } },
      B7: { raw: "'014 12 34 56" }, B6: { raw: '14123456' },
    });
    expect(runCheck({ type: 'value', cell: 'G4', expect: 4307 }, ctx).ok).toBe(true);
    expect(runCheck({ type: 'usesFunction', cell: 'G4', fn: 'GEMIDDELDE', nestedIn: 'AFRONDEN' }, ctx).ok).toBe(true);
    expect(runCheck({ type: 'usesAbsoluteRef', cell: 'B28', ref: '$G$21' }, ctx).ok).toBe(true);
    expect(runCheck({ type: 'value', cell: 'B28', expect: 0.25 }, ctx).ok).toBe(true);
    expect(runCheck({ type: 'format', range: 'B28', expect: '0,0%' }, ctx).ok).toBe(true);
    expect(runCheck({ type: 'format', range: 'B21', expect: '0,0%' }, ctx).ok).toBe(false);
    expect(runCheck({ type: 'isText', cell: 'B7', expect: '014 12 34 56' }, ctx).ok).toBe(true);
    expect(runCheck({ type: 'isText', cell: 'B6' }, ctx).ok).toBe(false);
  });
  it('rangeFilled en fillPattern', () => {
    const cells: Record<A1, CellData> = { A11: { raw: 'september' }, A12: { raw: 'oktober' }, A13: { raw: 'November' }, B30: { raw: '3,5' }, C30: { raw: '5,2' }, B11: { raw: '2845' }, C11: { raw: '4120' }, B12: { raw: '3120' }, C12: { raw: '4655' } };
    cells.B34 = { raw: '=B11*B$30' };
    cells.C34 = { raw: '=C11*C$30' };
    cells.B35 = { raw: '=B12*B$30' };
    cells.C35 = { raw: '=C12*C30' };
    const ctx = build(cells);
    expect(runCheck({ type: 'rangeFilled', range: 'A12:A13', values: ['oktober', 'november'] }, ctx).ok).toBe(true);
    expect(runCheck({ type: 'fillPattern', range: 'B34:C34', anchor: 'B34', formula: '=B11*B$30' }, ctx).ok).toBe(true);
    const r = runCheck({ type: 'fillPattern', range: 'B34:C35', anchor: 'B34', formula: '=B11*B$30' }, ctx);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('C35');
  });
  it('werkt met tabblad-gekwalificeerde verwijzingen', () => {
    const ctx = build({ A1: { raw: '=Totaal!B2*2' } }, { Totaal: { B2: { raw: '21' }, B3: { raw: '=B2+1' } } });
    expect(runCheck({ type: 'value', cell: 'A1', expect: 42 }, ctx).ok).toBe(true);
    expect(runCheck({ type: 'value', cell: 'Totaal!B3', expect: 22 }, ctx).ok).toBe(true);
    expect(runCheck({ type: 'formula', cell: 'A1', expect: '=Totaal!B2*2' }, ctx).ok).toBe(true);
    expect(runCheck({ type: 'rangeFilled', range: 'Totaal!B2:B3', values: [21, 22] }, ctx).ok).toBe(true);
    expect(runCheck({ type: 'fillPattern', range: 'Totaal!B3:B3', anchor: 'Totaal!B3', formula: '=B2+1' }, ctx).ok).toBe(true);
  });
  it('meldt fouten', () => {
    const ctx = build({ A1: { raw: '=1/0' } });
    expect(runCheck({ type: 'value', cell: 'A1', expect: 1 }, ctx).message).toContain('#DEEL/0!');
  });
});
