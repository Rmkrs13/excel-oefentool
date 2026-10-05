import { describe, expect, it } from 'vitest';
import { SheetEngine, prepareFormula } from './engine';
import { parseUserInput } from './parseInput';
import { parseA1, parseRange, rangeToA1, toA1 } from './address';

describe('address', () => {
  it('converteert A1 <-> Addr', () => {
    expect(parseA1('A1')).toEqual({ row: 0, col: 0 });
    expect(parseA1('$G$21')).toEqual({ row: 20, col: 6 });
    expect(toA1({ row: 10, col: 27 })).toBe('AB11');
    expect(rangeToA1(parseRange('F11:B11'))).toBe('B11:F11');
  });
});

describe('parseUserInput', () => {
  it('leest Nederlandse getallen', () => {
    expect(parseUserInput('3,5')).toEqual({ kind: 'number', value: 3.5 });
    expect(parseUserInput('1.000')).toEqual({ kind: 'number', value: 1000 });
    expect(parseUserInput('-12')).toEqual({ kind: 'number', value: -12 });
  });
  it('houdt tekst tekst', () => {
    expect(parseUserInput("'014 12 34 56")).toEqual({ kind: 'text', value: '014 12 34 56' });
    expect(parseUserInput('2300', { kind: 'text' })).toEqual({ kind: 'text', value: '2300' });
    expect(parseUserInput('september')).toEqual({ kind: 'text', value: 'september' });
    expect(parseUserInput('014 12 34 56')).toEqual({ kind: 'text', value: '014 12 34 56' });
  });
  it('herkent percentages, valuta en datums', () => {
    expect(parseUserInput('12,5%')).toMatchObject({ kind: 'number', value: 0.125, inferredFormat: { kind: 'percent', decimals: 1 } });
    expect(parseUserInput('€ 3,5')).toMatchObject({ kind: 'number', value: 3.5, inferredFormat: { kind: 'currency' } });
    expect(parseUserInput('12/09/2016')).toMatchObject({ kind: 'number', value: 42625, inferredFormat: { kind: 'date' } });
  });
});

const one = (cells: Record<string, { raw: string; format?: { kind: 'text' } }>, rows = 10, cols = 12) => [{ name: 'Blad1', rows, cols, cells }];
const B = 'Blad1';

describe('prepareFormula', () => {
  it('zet losse WAAR/ONWAAR om naar functies', () => {
    expect(prepareFormula('=VERT.ZOEKEN(C2;E5:F8;2;ONWAAR)')).toBe('=VERT.ZOEKEN(C2;E5:F8;2;ONWAAR())');
    expect(prepareFormula('=ALS(A1;WAAR;ONWAAR)')).toBe('=ALS(A1;WAAR();ONWAAR())');
    expect(prepareFormula('=ONWAAR()')).toBe('=ONWAAR()');
    expect(prepareFormula('=ALS(A1="WAAR";1;0)')).toBe('=ALS(A1="WAAR";1;0)');
    expect(prepareFormula('=WAARDE("1")')).toBe('=WAARDE("1")');
  });
});

describe('SheetEngine', () => {
  it('rekent geneste Nederlandse functies uit', () => {
    const e = new SheetEngine();
    e.load(one(
      {
        B2: { raw: '4850' }, C2: { raw: '3890' }, D2: { raw: '4180' },
        B3: { raw: '3910' }, C3: { raw: '4105' }, D3: { raw: '3790' },
        B4: { raw: '3670' }, C4: { raw: '3780' }, D4: { raw: '3920' },
        B5: { raw: '4140' }, C5: { raw: '4270' }, D5: { raw: '3950' },
        G4: { raw: '=AFRONDEN(GEMIDDELDE(B2:D5);0)' },
      }),
    );
    expect(e.getValue(B, parseA1('G4')).value).toBe(4038);
    e.destroy();
  });
  it('geeft Excel-fouten in het Nederlands', () => {
    const e = new SheetEngine();
    e.load(one({ A1: { raw: '=1/0' }, A2: { raw: '=ONBEKEND(1)' }, A3: { raw: '=SOM(1;"a")' } }));
    expect(e.getValue(B, parseA1('A1')).error?.text).toBe('#DEEL/0!');
    expect(e.getValue(B, parseA1('A2')).error?.text).toBe('#NAAM?');
    expect(e.getValue(B, parseA1('A3')).error?.text).toBe('#WAARDE!');
    e.destroy();
  });
  it('herberekent afhankelijke cellen bij setCells', () => {
    const e = new SheetEngine();
    e.load(one({ A1: { raw: '1' }, A2: { raw: '2' }, A3: { raw: '=SOM(A1:A2)' } }));
    const changes = e.setCells([{ sheet: B, addr: parseA1('A1'), cell: { raw: '10' } }]);
    const a3 = changes.find((c) => c.a1 === 'A3');
    expect(a3?.value.value).toBe(12);
    e.destroy();
  });
  it('trekt gemengde verwijzingen correct door', () => {
    const e = new SheetEngine();
    e.load(one({}, 50, 12));
    expect(e.shiftFormula(parseA1('H4'), '=$G4*H$3', parseA1('I5'))).toBe('=$G5*I$3');
    expect(e.shiftFormula(parseA1('B34'), '=B11*B$30', parseA1('F43'))).toBe('=F20*F$30');
    expect(e.shiftFormula(parseA1('C5'), '=B5/$B$3', parseA1('C8'))).toBe('=B8/$B$3');
    e.destroy();
  });
  it('slaat tekst met voorloopnul op als tekst en datums als getal', () => {
    const e = new SheetEngine();
    e.load(one({ A1: { raw: "'014 12 34 56" }, A2: { raw: '2300', format: { kind: 'text' } }, A3: { raw: '12/09/2016' } }));
    expect(e.getValue(B, parseA1('A1')).value).toBe('014 12 34 56');
    expect(e.getValue(B, parseA1('A2')).value).toBe('2300');
    expect(e.getValue(B, parseA1('A3')).value).toBe(42625);
    e.destroy();
  });
  it('rekent over meerdere tabbladen en met zoekfuncties', () => {
    const e = new SheetEngine();
    e.load([
      { name: 'semester1', rows: 5, cols: 5, cells: { D5: { raw: '10' } } },
      { name: 'semester 2', rows: 5, cols: 5, cells: { D5: { raw: '12' } } },
      {
        name: 'Totaal',
        rows: 10,
        cols: 8,
        cells: {
          D5: { raw: "=semester1!D5*0,4+'semester 2'!D5*0,6" },
          E2: { raw: 'Genk' }, F2: { raw: '80' }, E3: { raw: 'Gent' }, F3: { raw: '60' },
          A1: { raw: '=VERT.ZOEKEN("Gent";E2:F3;2;ONWAAR)' },
          A2: { raw: '=X.ZOEKEN("Genk";E2:E3;F2:F3)' },
          A3: { raw: '=ALS(F2>70;"groot";"klein")' },
        },
      },
    ]);
    expect(e.getValue('Totaal', parseA1('D5')).value).toBeCloseTo(11.2);
    expect(e.getValue('Totaal', parseA1('A1')).value).toBe(60);
    expect(e.getValue('Totaal', parseA1('A2')).value).toBe(80);
    expect(e.getValue('Totaal', parseA1('A3')).value).toBe('groot');
    const ch = e.setCells([{ sheet: 'semester1', addr: parseA1('D5'), cell: { raw: '20' } }]);
    expect(ch.find((c) => c.sheet === 'Totaal' && c.a1 === 'D5')?.value.value).toBeCloseTo(15.2);
    expect(e.shiftFormula(parseA1('D5'), "=semester1!D5*0,4+'semester 2'!D5*0,6", parseA1('E6'))).toBe("=semester1!E6*0,4+'semester 2'!E6*0,6");
    e.destroy();
  });
});
