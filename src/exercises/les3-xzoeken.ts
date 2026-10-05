import type { A1, CellData, CheckContext, Exercise } from './types';

const codes = ['A', 'B', 'C', 'D', 'E', 'F'];
const kortingen = [0.06, 0.08, 0.1, 0.12, 0.14, 0.16];

const cells: Record<A1, CellData> = {
  A1: { raw: 'Code:', style: { bold: true } },
  A2: { raw: 'Korting:', style: { bold: true } },
  I1: { raw: 'Keuze code:', style: { bold: true } },
  J1: { raw: 'B' },
  I2: { raw: 'Korting:', style: { bold: true } },
  I4: { raw: 'Keuze korting:', style: { bold: true } },
  J4: { raw: '0,12', format: { kind: 'percent', decimals: 0 } },
  I5: { raw: 'Code:', style: { bold: true } },
};
codes.forEach((c, i) => {
  cells[`${'BCDEFG'[i]}1`] = { raw: c };
  cells[`${'BCDEFG'[i]}2`] = { raw: String(kortingen[i]).replace('.', ','), format: { kind: 'percent', decimals: 0 } };
});

function kortingVoor(ctx: CheckContext): number | null {
  const code = String(ctx.value('J1') ?? '').trim().toUpperCase();
  for (let i = 0; i < codes.length; i++) {
    if (String(ctx.value(`${'BCDEFG'[i]}1`) ?? '').trim().toUpperCase() === code) {
      const k = ctx.value(`${'BCDEFG'[i]}2`);
      return typeof k === 'number' ? k : null;
    }
  }
  return null;
}

function codeVoor(ctx: CheckContext): string | null {
  const k = ctx.value('J4');
  if (typeof k !== 'number') return null;
  for (let i = 0; i < codes.length; i++) {
    const v = ctx.value(`${'BCDEFG'[i]}2`);
    if (typeof v === 'number' && Math.abs(v - k) < 1e-9) return String(ctx.value(`${'BCDEFG'[i]}1`) ?? '');
  }
  return null;
}

export const les3Xzoeken: Exercise = {
  id: 'les3-xzoeken',
  version: 1,
  title: 'Opzoeken in een rij met X.ZOEKEN',
  intro:
    'De kortingscodes staan hier naast elkaar in een rij, niet onder elkaar in een kolom. Vroeger had je daar HORIZ.ZOEKEN voor nodig; wij gebruiken HORIZ.ZOEKEN en VERT.ZOEKEN niet meer. X.ZOEKEN werkt in rijen én kolommen, en ook omgekeerd.',
  sheets: [{ name: 'Korting', rows: 8, cols: 11, cells, colWidths: { A: 10, B: 7, C: 7, D: 7, E: 7, F: 7, G: 7, I: 15, J: 9 } }],
  steps: [
    {
      id: 'korting',
      title: 'Korting opzoeken bij een code',
      text: 'Bepaal in **J2** de korting die hoort bij de code in **J1**, met **X.ZOEKEN**: zoek J1 in de rij met codes (B1:G1) en geef de waarde uit de rij met kortingen (B2:G2). Geef J2 de notatie Percentage.',
      hint: '`=X.ZOEKEN(J1;B1:G1;B2:G2)`. Precies dezelfde opbouw als bij een kolom: wat zoek je, waar zoek je, wat geef je terug.',
      checks: [
        { type: 'usesFunction', cell: 'J2', fn: 'X.ZOEKEN' },
        {
          type: 'predicate',
          label: 'J2 geeft de korting van de code in J1',
          message: 'J2 geeft niet de korting die bij de code in J1 hoort (of #N/B als die code niet bestaat).',
          test: (ctx) => {
            const k = kortingVoor(ctx);
            return k === null ? ctx.errorText('J2') === '#N/B' : ctx.value('J2') === k;
          },
        },
        { type: 'format', range: 'J2', expect: ['0%', '0,0%', '0,00%'] },
      ],
    },
    {
      id: 'andere',
      title: 'Een andere code kiezen',
      text: 'Typ in **J1** een andere code, bijvoorbeeld **E**. De korting in J2 volgt mee.',
      checks: [
        {
          type: 'predicate',
          label: 'J1 bevat een andere code dan B',
          message: 'Typ in J1 een andere code (A, C, D, E of F).',
          test: (ctx) => {
            const code = String(ctx.value('J1') ?? '').trim().toUpperCase();
            return code !== '' && code !== 'B' && kortingVoor(ctx) !== null && ctx.value('J2') === kortingVoor(ctx);
          },
        },
      ],
    },
    {
      id: 'omgekeerd',
      title: 'Omgekeerd: de code bij een korting',
      text: 'In **J4** staat een korting. Zoek in **J5** op welke code daarbij hoort. Met X.ZOEKEN draai je gewoon de twee bereiken om: zoek in de rij met kortingen, geef terug uit de rij met codes. Met HORIZ.ZOEKEN kon dat niet, omdat die alleen in de eerste rij kan zoeken.',
      hint: '`=X.ZOEKEN(J4;B2:G2;B1:G1)`.',
      checks: [
        { type: 'usesFunction', cell: 'J5', fn: 'X.ZOEKEN' },
        {
          type: 'predicate',
          label: 'J5 geeft de code bij de korting in J4',
          message: 'J5 geeft niet de code die bij de korting in J4 hoort.',
          test: (ctx) => codeVoor(ctx) !== null && ctx.value('J5') === codeVoor(ctx),
        },
      ],
    },
  ],
};
