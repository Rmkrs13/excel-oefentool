import type { A1, CellData, CheckContext, Exercise } from './types';

const lenen: Record<A1, CellData> = {
  A1: { raw: 'Geleend bedrag', style: { bold: true } },
  B1: { raw: '300000', format: { kind: 'currency', decimals: 0, grouping: true, currency: '€' } },
  A2: { raw: 'Jaarlijkse nominale rente', style: { bold: true } },
  B2: { raw: '0,02', format: { kind: 'percent', decimals: 2 } },
  A3: { raw: 'Looptijd in jaren', style: { bold: true } },
  B3: { raw: '20' },
  A5: { raw: 'Maandelijkse betaling (begin van de termijn):', style: { bold: true } },
};
const sparen: Record<A1, CellData> = {
  A1: { raw: 'Gewenst kapitaal na 20 jaar', style: { bold: true } },
  B1: { raw: '20000', format: { kind: 'currency', decimals: 0, grouping: true, currency: '€' } },
  A2: { raw: 'Jaarlijkse nominale rente', style: { bold: true } },
  B2: { raw: '0,0195', format: { kind: 'percent', decimals: 2 } },
  A3: { raw: 'Looptijd in jaren', style: { bold: true } },
  B3: { raw: '20' },
  A5: { raw: 'Maandelijks te sparen (begin van de termijn):', style: { bold: true } },
};

/** Excel-BET: betaling per periode, met type 1 = begin van de periode. */
function bet(rate: number, nper: number, pv: number, fv: number, type: 0 | 1): number {
  if (rate === 0) return -(pv + fv) / nper;
  const f = Math.pow(1 + rate, nper);
  return -(pv * f + fv) / ((1 + rate * type) * (f - 1) / rate);
}
const lenenBedrag = bet(0.02 / 12, 240, 300000, 0, 1); // ≈ -1515,12
const sparenBedrag = bet(0.0195 / 12, 240, 0, 20000, 1); // ≈ -68,09

function bedragOk(ctx: CheckContext, cell: string, verwacht: number): boolean {
  const v = ctx.value(cell);
  return typeof v === 'number' && Math.abs(Math.abs(v) - Math.abs(verwacht)) < 0.01;
}

export const les3Bet: Exercise = {
  id: 'les3-bet',
  version: 1,
  title: 'Lenen en sparen met BET',
  intro:
    'De functie BET berekent wat je per periode betaalt of spaart. De argumenten: rente per periode, aantal perioden, huidige waarde, toekomstige waarde, en type (1 = betaling aan het begin van de periode). Let op: de rente en de looptijd zijn per jaar gegeven, maar je betaalt per maand.',
  sheets: [
    { name: 'Lenen', rows: 7, cols: 4, cells: lenen, colWidths: { A: 42, B: 14 } },
    { name: 'Sparen', rows: 7, cols: 4, cells: sparen, colWidths: { A: 42, B: 14 } },
  ],
  steps: [
    {
      id: 'lenen',
      title: 'Maandelijkse afbetaling van een lening',
      text: 'Op tabblad **Lenen**: bereken in **B5** het maandelijks te betalen bedrag. Rente per maand is B2 gedeeld door 12, het aantal maanden is B3 maal 12, de huidige waarde is het geleende bedrag, de toekomstige waarde is 0 en de betaling gebeurt aan het begin van de maand (type 1). Geef het resultaat de valutanotatie met 2 decimalen.',
      hint: '`=BET(B2/12;B3*12;B1;0;1)`. Het resultaat is negatief: het is geld dat je uitgeeft. Wil je een positief getal, zet dan een minteken voor B1.',
      checks: [
        { type: 'usesFunction', cell: 'Lenen!B5', fn: 'BET' },
        { type: 'predicate', label: 'B5 geeft ongeveer € 1.515,12 per maand', message: 'B5 klopt niet. Deel de jaarrente door 12 en vermenigvuldig de looptijd met 12.', test: (ctx) => bedragOk(ctx, 'Lenen!B5', lenenBedrag) },
        { type: 'format', range: 'Lenen!B5', expect: ['€ #.##0,00'] },
      ],
    },
    {
      id: 'sparen',
      title: 'Maandelijks sparen voor een doel',
      text: 'Op tabblad **Sparen**: bereken in **B5** hoeveel je elke maand moet sparen om na 20 jaar het kapitaal in B1 te hebben. Nu is de huidige waarde 0 en de toekomstige waarde het gewenste kapitaal. Opnieuw aan het begin van de maand, en opnieuw valutanotatie met 2 decimalen.',
      hint: '`=BET(B2/12;B3*12;0;B1;1)`.',
      checks: [
        { type: 'usesFunction', cell: 'Sparen!B5', fn: 'BET' },
        { type: 'predicate', label: 'B5 geeft ongeveer € 68,09 per maand', message: 'B5 klopt niet. De huidige waarde is 0, de toekomstige waarde is het gewenste kapitaal.', test: (ctx) => bedragOk(ctx, 'Sparen!B5', sparenBedrag) },
        { type: 'format', range: 'Sparen!B5', expect: ['€ #.##0,00'] },
      ],
    },
  ],
};
