import type { A1, CellData, Exercise } from './types';

const data = [
  ['januari', 4850, 3890, 4180],
  ['februari', 3910, 4105, 3790],
  ['maart', 3670, 3780, 3920],
  ['april', 4140, 4270, 3950],
] as const;

const cells: Record<A1, CellData> = {
  B1: { raw: 'Winkel 1', style: { bold: true } },
  C1: { raw: 'Winkel 2', style: { bold: true } },
  D1: { raw: 'Winkel 3', style: { bold: true } },
  F2: { raw: 'Gemiddelde:' },
  F4: { raw: 'Afgerond gemiddelde:' },
};
data.forEach(([maand, a, b, c], i) => {
  const r = 2 + i;
  cells[`A${r}`] = { raw: maand };
  cells[`B${r}`] = { raw: String(a) };
  cells[`C${r}`] = { raw: String(b) };
  cells[`D${r}`] = { raw: String(c) };
});

export const functiesNesten: Exercise = {
  id: 'functies-nesten',
  version: 1,
  title: 'Functies nesten: AFRONDEN en GEMIDDELDE',
  intro: 'De omzet van drie winkels over vier maanden. Bereken het gemiddelde en rond het af met een geneste functie.',
  sheets: [{ name: 'Blad1', rows: 8, cols: 8, cells, colWidths: { F: 20 } }],
  steps: [
    {
      id: 'gemiddelde',
      title: 'Gemiddelde van alle waarden',
      text: 'Bereken in **G2** het gemiddelde van alle twaalf omzetcijfers (B2:D5) met **GEMIDDELDE**.',
      checks: [{ type: 'formula', cell: 'G2', expect: ['=GEMIDDELDE(B2:D5)', '=GEMIDDELDE(B2:B5;C2:C5;D2:D5)'] }],
    },
    {
      id: 'nesten',
      title: 'Afronden op een geheel getal',
      text: 'Bereken in **G4** hetzelfde gemiddelde, maar afgerond op 0 decimalen. Gebruik daarvoor **AFRONDEN** met daarin **GEMIDDELDE**: `=AFRONDEN(GEMIDDELDE(...);0)`.',
      hint: 'De functie binnenin (GEMIDDELDE) wordt eerst berekend; het resultaat is het eerste argument van AFRONDEN. Het tweede argument, na de puntkomma, is het aantal decimalen.',
      checks: [
        { type: 'usesFunction', cell: 'G4', fn: 'GEMIDDELDE', nestedIn: 'AFRONDEN' },
        { type: 'value', cell: 'G4', expect: 4038 },
      ],
    },
    {
      id: 'verschil',
      title: 'Notatie versus afronden',
      text: 'Geef **G2** de notatie `0` (0 decimalen). Je ziet nu tweemaal 4038, maar kijk in de formulebalk: in G2 zit nog altijd 4037,9166... De notatie verandert alleen wat je ziet; AFRONDEN verandert de waarde zelf.',
      checks: [{ type: 'format', range: 'G2', expect: '0' }],
    },
  ],
};
