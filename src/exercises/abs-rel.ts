import type { A1, CellData, Exercise } from './types';

const cells: Record<A1, CellData> = {
  A1: { raw: 'Omzet in aantallen', style: { bold: true } },
  C1: { raw: 'relatief aandeel', style: { bold: true } },
  A3: { raw: 'Totaal', style: { bold: true } },
  A5: { raw: 'West' },
  B5: { raw: '23' },
  A6: { raw: 'Oost' },
  B6: { raw: '26' },
  A7: { raw: 'Zuid' },
  B7: { raw: '45' },
  A8: { raw: 'Noord' },
  B8: { raw: '17' },
  G1: { raw: 'Maaltafels', style: { bold: true } },
};
for (let i = 1; i <= 5; i++) {
  cells[`${'GHIJKL'[i]}3`] = { raw: String(i), style: { bold: true } };
  cells[`G${3 + i}`] = { raw: String(i), style: { bold: true } };
}

export const absRel: Exercise = {
  id: 'abs-rel',
  version: 1,
  title: 'Absoluut en relatief verwijzen',
  intro: 'Eén formule schrijven en doortrekken: dat lukt alleen als je weet welke verwijzing mee mag schuiven en welke vast moet staan met $.',
  sheets: [{ name: 'Blad1', rows: 12, cols: 12, cells, colWidths: { A: 18, C: 15, G: 11 } }],
  steps: [
    {
      id: 'totaal',
      title: 'Totaal berekenen',
      text: 'Bereken in **B3** het totaal van de vier regio’s met **SOM**.',
      checks: [{ type: 'formula', cell: 'B3', expect: ['=SOM(B5:B8)', '=SOM(B5;B6;B7;B8)'] }],
    },
    {
      id: 'aandeel',
      title: 'Relatief aandeel met een absolute verwijzing',
      text: 'Bereken in **C5** het aandeel van West in het totaal: de omzet van West gedeeld door het totaal in B3. Trek de formule door tot **C8**. Zet de verwijzing naar het totaal vast met `$`, anders schuift B3 mee naar B4, B5, ...',
      hint: 'Typ `=B5/B3`, zet de cursor bij B3 en druk op **F4**: de verwijzing wordt `$B$3`. Trek daarna door met de vulgreep.',
      checks: [
        { type: 'usesAbsoluteRef', cell: 'C5', ref: '$B$3' },
        { type: 'fillPattern', range: 'C5:C8', anchor: 'C5', formula: '=B5/$B$3' },
      ],
    },
    {
      id: 'procent',
      title: 'Percentages tonen',
      text: 'Geef **C5:C8** de notatie Percentage, zodat je bijvoorbeeld 20,7% ziet in plaats van 0,207.',
      checks: [{ type: 'format', range: 'C5:C8', expect: ['0%', '0,0%', '0,00%'] }],
    },
    {
      id: 'maaltafels',
      title: 'Maaltafels met een gemengde verwijzing',
      text: 'Vul de tafel **H4:L8** met één formule in **H4** die je naar rechts én naar beneden doortrekt: het getal in kolom G maal het getal in rij 3. Zet enkel de kolom G vast (`$G4`) en enkel de rij 3 vast (`H$3`).',
      hint: 'Typ `=G4*H3`. Druk bij G4 meerdere keren op F4 tot er `$G4` staat, en bij H3 tot er `H$3` staat. Trek H4 eerst naar rechts tot L4, en dan H4:L4 naar beneden tot rij 8.',
      checks: [{ type: 'fillPattern', range: 'H4:L8', anchor: 'H4', formula: '=$G4*H$3' }],
    },
  ],
};
