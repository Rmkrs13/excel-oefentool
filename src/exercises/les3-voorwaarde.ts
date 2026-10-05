import type { A1, CellData, Exercise } from './types';

const verkopen: Array<[number, number]> = [
  [2480, 174],
  [4960, 347],
  [3150, 215],
  [9620, 694],
  [1980, 139],
  [2970, 208],
];
const somCells: Record<A1, CellData> = {
  A1: { raw: 'Verkoopprijs', style: { bold: true } },
  B1: { raw: 'Commissie', style: { bold: true } },
  D1: { raw: 'Grens:', style: { bold: true } },
  D2: { raw: '>4000' },
  F1: { raw: 'Resultaat:', style: { bold: true } },
};
verkopen.forEach(([prijs, commissie], i) => {
  somCells[`A${2 + i}`] = { raw: String(prijs) };
  somCells[`B${2 + i}`] = { raw: String(commissie) };
});

const geslacht = ['man', 'vrouw', 'man', 'man', 'vrouw', 'man', 'vrouw', 'man'];
const lengte = [182, 173, 183, 191, 187, 172, 176, 178];
function lengteSheet(criterium: string, label: string): Record<A1, CellData> {
  const cells: Record<A1, CellData> = {
    A1: { raw: 'Geslacht:', style: { bold: true } },
    A2: { raw: 'Lichaamslengte (cm):', style: { bold: true } },
    A4: { raw: 'Criterium:', style: { bold: true } },
    B4: { raw: criterium },
    A5: { raw: label, style: { bold: true } },
  };
  geslacht.forEach((g, i) => {
    cells[`${'BCDEFGHI'[i]}1`] = { raw: g };
    cells[`${'BCDEFGHI'[i]}2`] = { raw: String(lengte[i]) };
  });
  return cells;
}

const gemGroot = lengte.filter((l) => l > 180).reduce((a, b) => a + b, 0) / 4;

export const les3Voorwaarde: Exercise = {
  id: 'les3-voorwaarde',
  version: 1,
  title: 'Rekenen met een voorwaarde: SOM.ALS en GEMIDDELDE.ALS',
  intro: 'Tel of middel alleen de waarden die aan een voorwaarde voldoen. Het criterium staat telkens in een cel, zodat je het kunt aanpassen zonder de formule te wijzigen.',
  sheets: [
    { name: 'SOM.ALS', rows: 10, cols: 7, cells: somCells, colWidths: { A: 13, B: 12, D: 10, F: 12 } },
    { name: 'GEMIDDELDE.ALS 1', rows: 8, cols: 10, cells: lengteSheet('vrouw', 'Gemiddelde lengte:'), colWidths: { A: 22, B: 9, C: 9, D: 9, E: 9, F: 9, G: 9, H: 9, I: 9 } },
    { name: 'GEMIDDELDE.ALS 2', rows: 8, cols: 10, cells: lengteSheet('>180', 'Resultaat:'), colWidths: { A: 22, B: 9, C: 9, D: 9, E: 9, F: 9, G: 9, H: 9, I: 9 } },
  ],
  steps: [
    {
      id: 'somals',
      title: 'SOM.ALS: commissie voor verkopen boven de grens',
      text: 'Op tabblad **SOM.ALS**: bereken in **F2** de totale commissie voor alle verkopen boven 4000. Gebruik **SOM.ALS** met drie argumenten: het bereik waarin je de voorwaarde test (de verkoopprijzen), het criterium (de cel **D2**, waar `>4000` staat), en het bereik dat je optelt (de commissies).',
      hint: '`=SOM.ALS(A2:A7;D2;B2:B7)`. Het criterium mag ook rechtstreeks in de formule: `">4000"`, maar met een cel kun je de grens aanpassen zonder de formule te wijzigen.',
      checks: [
        { type: 'usesFunction', cell: 'SOM.ALS!F2', fn: 'SOM.ALS' },
        { type: 'value', cell: 'SOM.ALS!F2', expect: 1041 },
      ],
    },
    {
      id: 'gemals1',
      title: 'GEMIDDELDE.ALS met een apart criteriumbereik',
      text: 'Op tabblad **GEMIDDELDE.ALS 1**: bereken in **B5** de gemiddelde lengte van de personen met het geslacht dat in **B4** staat. **GEMIDDELDE.ALS** werkt zoals SOM.ALS: het bereik met de voorwaarde (het geslacht), het criterium (B4), en het bereik waarvan je het gemiddelde wilt (de lengtes).',
      hint: "`=GEMIDDELDE.ALS(B1:I1;B4;B2:I2)`. Typ daarna eens 'man' in B4: het gemiddelde past zich aan.",
      checks: [
        { type: 'usesFunction', cell: "'GEMIDDELDE.ALS 1'!B5", fn: 'GEMIDDELDE.ALS' },
        {
          type: 'predicate',
          label: 'B5 geeft de gemiddelde lengte voor het criterium in B4',
          message: 'B5 geeft niet het juiste gemiddelde voor het geslacht in B4.',
          test: (ctx) => {
            const crit = String(ctx.value("'GEMIDDELDE.ALS 1'!B4") ?? '').trim().toLowerCase();
            const sel = lengte.filter((_, i) => geslacht[i] === crit);
            if (sel.length === 0) return false;
            const expected = sel.reduce((a, b) => a + b, 0) / sel.length;
            const v = ctx.value("'GEMIDDELDE.ALS 1'!B5");
            return typeof v === 'number' && Math.abs(v - expected) < 0.001;
          },
        },
      ],
    },
    {
      id: 'gemals2',
      title: 'GEMIDDELDE.ALS met een voorwaarde op de getallen zelf',
      text: 'Op tabblad **GEMIDDELDE.ALS 2**: bereken in **B5** de gemiddelde lengte van de personen die groter zijn dan 180 cm. Het criterium `>180` staat in **B4**. De voorwaarde gaat nu over de lengtes zelf, dus het derde argument (het gemiddeldebereik) heb je niet nodig.',
      hint: '`=GEMIDDELDE.ALS(B2:I2;B4)`. Als je het derde argument weglaat, middelt Excel het bereik uit het eerste argument.',
      checks: [
        { type: 'usesFunction', cell: "'GEMIDDELDE.ALS 2'!B5", fn: 'GEMIDDELDE.ALS' },
        { type: 'value', cell: "'GEMIDDELDE.ALS 2'!B5", expect: gemGroot, tolerance: 1e-6 },
      ],
    },
  ],
};

