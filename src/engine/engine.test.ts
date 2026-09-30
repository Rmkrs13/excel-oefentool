import { describe, expect, it } from 'vitest';
import { SheetEngine } from './engine';
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

describe('SheetEngine', () => {
  it('rekent geneste Nederlandse functies uit', () => {
    const e = new SheetEngine();
    e.load(
      {
        B2: { raw: '4850' }, C2: { raw: '3890' }, D2: { raw: '4180' },
        B3: { raw: '3910' }, C3: { raw: '4105' }, D3: { raw: '3790' },
        B4: { raw: '3670' }, C4: { raw: '3780' }, D4: { raw: '3920' },
        B5: { raw: '4140' }, C5: { raw: '4270' }, D5: { raw: '3950' },
        G4: { raw: '=AFRONDEN(GEMIDDELDE(B2:D5);0)' },
      },
      10, 10,
    );
    expect(e.getValue(parseA1('G4')).value).toBe(4038);
    e.destroy();
  });
  it('geeft Excel-fouten in het Nederlands', () => {
    const e = new SheetEngine();
    e.load({ A1: { raw: '=1/0' }, A2: { raw: '=ONBEKEND(1)' }, A3: { raw: '=SOM(1;"a")' } }, 5, 5);
    expect(e.getValue(parseA1('A1')).error?.text).toBe('#DEEL/0!');
    expect(e.getValue(parseA1('A2')).error?.text).toBe('#NAAM?');
    expect(e.getValue(parseA1('A3')).error?.text).toBe('#WAARDE!');
    e.destroy();
  });
  it('herberekent afhankelijke cellen bij setCells', () => {
    const e = new SheetEngine();
    e.load({ A1: { raw: '1' }, A2: { raw: '2' }, A3: { raw: '=SOM(A1:A2)' } }, 5, 5);
    const changes = e.setCells([{ addr: parseA1('A1'), cell: { raw: '10' } }]);
    const a3 = changes.find((c) => c.a1 === 'A3');
    expect(a3?.value.value).toBe(12);
    e.destroy();
  });
  it('trekt gemengde verwijzingen correct door', () => {
    const e = new SheetEngine();
    e.load({}, 10, 12);
    expect(e.shiftFormula(parseA1('H4'), '=$G4*H$3', parseA1('I5'))).toBe('=$G5*I$3');
    expect(e.shiftFormula(parseA1('B34'), '=B11*B$30', parseA1('F43'))).toBe('=F20*F$30');
    expect(e.shiftFormula(parseA1('C5'), '=B5/$B$3', parseA1('C8'))).toBe('=B8/$B$3');
    e.destroy();
  });
  it('slaat tekst met voorloopnul op als tekst en datums als getal', () => {
    const e = new SheetEngine();
    e.load({ A1: { raw: "'014 12 34 56" }, A2: { raw: '2300', format: { kind: 'text' } }, A3: { raw: '12/09/2016' } }, 5, 5);
    expect(e.getValue(parseA1('A1')).value).toBe('014 12 34 56');
    expect(e.getValue(parseA1('A2')).value).toBe('2300');
    expect(e.getValue(parseA1('A3')).value).toBe(42625);
    e.destroy();
  });
});
