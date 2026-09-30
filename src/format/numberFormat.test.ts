import { describe, expect, it } from 'vitest';
import { FORMAT_PRESETS, adjustDecimals, formatCode, formatValue, parseFormatCode } from './numberFormat';

const dv = (value: number) => ({ value });

describe('formatValue', () => {
  it('formatteert volgens de presets', () => {
    const n = 1256.15624634;
    expect(formatValue(dv(n), '', parseFormatCode('Standaard')).text).toBe('1256,156246');
    expect(formatValue(dv(n), '', parseFormatCode('0')).text).toBe('1256');
    expect(formatValue(dv(n), '', parseFormatCode('0,0')).text).toBe('1256,2');
    expect(formatValue(dv(n), '', parseFormatCode('#.##0')).text).toBe('1.256');
    expect(formatValue(dv(n), '', parseFormatCode('#.##0,00')).text).toBe('1.256,16');
    expect(formatValue(dv(0.2224), '', parseFormatCode('0,0%')).text).toBe('22,2%');
    expect(formatValue(dv(3.5), '', parseFormatCode('€ #.##0,00')).text).toBe('€ 3,50');
    expect(formatValue(dv(9957.5), '', parseFormatCode('€ #.##0')).text).toBe('€ 9.958');
    expect(formatValue(dv(42625), '', parseFormatCode('dd/mm/jjjj')).text).toBe('12/09/2016');
  });
  it('lijnt tekst links en getallen rechts uit', () => {
    expect(formatValue({ value: '014 12 34 56' }, "'014 12 34 56").align).toBe('left');
    expect(formatValue(dv(14123456), '14123456').align).toBe('right');
    expect(formatValue({ value: null, error: { type: 'NAME', text: '#NAAM?' } }, '=X(').text).toBe('#NAAM?');
  });
  it('Standaard toont getallen zoals Excel', () => {
    expect(formatValue(dv(8.571428571428571), '').text).toBe('8,571428571');
    expect(formatValue(dv(2820.5), '').text).toBe('2820,5');
    expect(formatValue(dv(12681), '').text).toBe('12681');
  });
});

describe('formatCode', () => {
  it('is omkeerbaar voor alle presets', () => {
    for (const p of FORMAT_PRESETS) expect(formatCode(parseFormatCode(p.code))).toBe(p.code);
  });
  it('adjustDecimals', () => {
    expect(formatCode(adjustDecimals(undefined, 1, 2820.5))).toBe('0,00');
    expect(formatCode(adjustDecimals(parseFormatCode('#.##0,0'), -1))).toBe('#.##0');
    expect(formatCode(adjustDecimals(parseFormatCode('0'), -1))).toBe('0');
    expect(formatCode(adjustDecimals(parseFormatCode('0,0%'), 1))).toBe('0,00%');
  });
});
