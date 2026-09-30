import { describe, expect, it } from 'vitest';
import { computeSeries } from './series';

const c = (raw: string, value: string | number | null = raw) => ({ cell: { raw }, value });

describe('computeSeries', () => {
  it('kopieert een enkel getal', () => {
    expect(computeSeries([c('5', 5)], 3).map((x) => x.raw)).toEqual(['5', '5', '5']);
  });
  it('trekt 1,2 door naar 3,4,5', () => {
    expect(computeSeries([c('1', 1), c('2', 2)], 3).map((x) => x.raw)).toEqual(['3', '4', '5']);
    expect(computeSeries([c('10', 10), c('20', 20)], 2).map((x) => x.raw)).toEqual(['30', '40']);
  });
  it('vult maanden aan', () => {
    expect(computeSeries([c('september')], 9).map((x) => x.raw)).toEqual(['oktober', 'november', 'december', 'januari', 'februari', 'maart', 'april', 'mei', 'juni']);
    expect(computeSeries([c('Januari')], 2).map((x) => x.raw)).toEqual(['Februari', 'Maart']);
    expect(computeSeries([c('jan'), c('feb')], 2).map((x) => x.raw)).toEqual(['mrt', 'apr']);
  });
  it('verhoogt een eindgetal in tekst', () => {
    expect(computeSeries([c('Winkel 1')], 2).map((x) => x.raw)).toEqual(['Winkel 2', 'Winkel 3']);
  });
  it('kopieert gewone tekst en formules', () => {
    expect(computeSeries([c('Totaal')], 2).map((x) => x.raw)).toEqual(['Totaal', 'Totaal']);
    expect(computeSeries([c('=SOM(B11:F11)', 1)], 1).map((x) => x.raw)).toEqual(['=SOM(B11:F11)']);
  });
  it('werkt ook omhoog', () => {
    expect(computeSeries([c('3', 3), c('4', 4)], 2, -1).map((x) => x.raw)).toEqual(['2', '1']);
    expect(computeSeries([c('maart')], 2, -1).map((x) => x.raw)).toEqual(['februari', 'januari']);
  });
});
