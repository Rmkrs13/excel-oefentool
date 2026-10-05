import type { A1, CellData, Exercise } from './types';

const students: Array<[string, string, number, number, number]> = [
  ['Alvarez', 'Joery', 10, 13, 14],
  ['Bruyneels', 'Yannick', 18, 14, 12],
  ['Coppens', 'Karen', 10, 6, 8],
  ['Deman', 'Laurens', 10, 19, 12],
  ['Dils', 'Katrien', 4, 12, 13],
  ['Fransen', 'Oliver', 5, 10, 10],
  ['Jansen', 'Kobe', 12, 10, 10],
  ['Kanps', 'Jorien', 9, 12, 9],
  ['Kenis', 'Ward', 3, 12, 7],
  ['Kop', 'Dimi', 9, 14, 12],
  ['Maers', 'Jasper', 6, 8, 2],
  ['Vandevelde', 'Carolien', 7, 5, 14],
  ['Vekemans', 'Thomas', 9, 14, 12],
  ['Wilmsen', 'Kevin', 8, 6, 9],
];

const cells: Record<A1, CellData> = {
  A1: { raw: 'klas:', style: { bold: true } },
  B1: { raw: '1 LOBR', style: { bold: true } },
  D1: { raw: 'Periode:', style: { bold: true } },
  F1: { raw: 'januari', style: { bold: true } },
  A2: { raw: 'Evaluatie januari', style: { bold: true } },
  D3: { raw: 'Didactiek' },
  E3: { raw: 'Anatomie' },
  F3: { raw: 'Gymnastiek' },
  G3: { raw: 'Totaal' },
  A4: { raw: 'Nr', style: { bold: true } },
  B4: { raw: 'Naam', style: { bold: true } },
  C4: { raw: 'Voornaam', style: { bold: true } },
  D4: { raw: '20' },
  E4: { raw: '20' },
  F4: { raw: '20' },
  G4: { raw: '60' },
  A5: { raw: '1' },
  A6: { raw: '2' },
  H19: { raw: 'gemiddelde' },
  H20: { raw: 'mediaan' },
  A21: { raw: 'aantal studenten:' },
  A22: { raw: 'slechtste resultaat:' },
  A23: { raw: 'beste resultaat:' },
};
students.forEach(([naam, voornaam, nl, wi, fr], i) => {
  const r = 5 + i;
  cells[`B${r}`] = { raw: naam };
  cells[`C${r}`] = { raw: voornaam };
  cells[`D${r}`] = { raw: String(nl) };
  cells[`E${r}`] = { raw: String(wi) };
  cells[`F${r}`] = { raw: String(fr) };
});

export const les1Evaluatie: Exercise = {
  id: 'les1-evaluatie',
  version: 3,
  title: 'Basisformules: SOM, GEMIDDELDE, MEDIAAN, MIN en MAX',
  intro:
    'De puntenlijst van klas 1 LOBR staat klaar. Vul de nummers aan, bereken totalen en statistieken met functies, en geef de getallen de juiste notatie.',
  sheets: [{ name: 'Blad1', rows: 26, cols: 9, cells, colWidths: { A: 18, B: 12, C: 11, D: 11, E: 11, F: 11, G: 11, H: 12 } }],
  steps: [
    {
      id: 'vulgreep',
      title: 'Nummers aanvullen met de vulgreep',
      text: 'In **A5** en **A6** staan de nummers 1 en 2. Selecteer A5:A6 en sleep de vulgreep (het groene vierkantje rechtsonder) naar beneden tot **A18**, zodat elke student een nummer heeft.',
      hint: 'Selecteer twee cellen zodat Excel het patroon (+1) herkent. Met één cel zou je alleen kopiëren.',
      checks: [{ type: 'rangeFilled', range: 'A7:A18', values: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] }],
    },
    {
      id: 'plus',
      title: 'Totaal met een rekenformule',
      text: 'Bereken in **G5** het totaal van Alvarez met een formule die de drie punten optelt: `=D5+E5+F5`. Een formule begint altijd met `=`.',
      hint: 'Typ `=`, klik op D5, typ `+`, klik op E5, typ `+`, klik op F5 en druk op Enter.',
      checks: [
        { type: 'predicate', label: 'G5 bevat een formule', message: 'G5 moet een formule zijn die begint met =.', test: (ctx) => ctx.formula('G5') !== null },
        { type: 'value', cell: 'G5', expect: 37 },
      ],
    },
    {
      id: 'som',
      title: 'Totaal met de functie SOM',
      text: 'Vervang de formule in **G5** door de functie **SOM** over het bereik D5:F5 en trek ze met de vulgreep door tot **G18**.',
      hint: 'Typ `=SO`, kies SOM met Tab, sleep over D5:F5 (of typ `D5:F5`), sluit het haakje en druk op Enter.',
      checks: [{ type: 'fillPattern', range: 'G5:G18', anchor: 'G5', formula: '=SOM(D5:F5)' }],
    },
    {
      id: 'gemiddelde',
      title: 'Gemiddelde per vak',
      text: 'Bereken in **D19** het gemiddelde van Didactiek met **GEMIDDELDE** en trek de formule door naar rechts tot **G19**.',
      checks: [{ type: 'fillPattern', range: 'D19:G19', anchor: 'D19', formula: '=GEMIDDELDE(D5:D18)' }],
    },
    {
      id: 'mediaan',
      title: 'Mediaan per vak',
      text: 'Bereken in **D20** de mediaan van Didactiek met **MEDIAAN** en trek door tot **G20**.',
      hint: 'De mediaan is de middelste waarde. Bij een even aantal is het het gemiddelde van de twee middelste.',
      checks: [{ type: 'fillPattern', range: 'D20:G20', anchor: 'D20', formula: '=MEDIAAN(D5:D18)' }],
    },
    {
      id: 'aantal',
      title: 'Aantal studenten',
      text: 'Tel in **C21** het aantal studenten met de functie **AANTALARG** over de namen in B5:B18.',
      hint: 'AANTAL telt alleen getallen. AANTALARG telt alle niet-lege cellen, dus ook tekst.',
      checks: [{ type: 'formula', cell: 'C21', expect: ['=AANTALARG(B5:B18)', '=AANTALARG(C5:C18)', '=AANTALARG(A5:A18)'] }],
    },
    {
      id: 'minmax',
      title: 'Slechtste en beste resultaat',
      text: 'Zoek in **C22** het laagste punt van alle vakken (**MIN**) en in **C23** het hoogste (**MAX**). Gebruik één bereik dat de drie kolommen omvat: D5:F18.',
      checks: [
        { type: 'formula', cell: 'C22', expect: ['=MIN(D5:F18)', '=MIN(D5:D18;E5:E18;F5:F18)'] },
        { type: 'formula', cell: 'C23', expect: ['=MAX(D5:F18)', '=MAX(D5:D18;E5:E18;F5:F18)'] },
      ],
    },
    {
      id: 'notatie',
      title: 'Getalnotatie',
      text: 'Geef de punten in **D5:F18** en de statistieken in **D19:G20** één decimaal (notatie `0,0`). De totalen in **G5:G18** krijgen geen decimalen (notatie `0`).',
      hint: 'Selecteer het bereik en kies de notatie in de toolbar, of gebruik de knoppen voor meer/minder decimalen.',
      checks: [
        { type: 'format', range: 'D5:F18', expect: '0,0' },
        { type: 'format', range: 'D19:G20', expect: '0,0' },
        { type: 'format', range: 'G5:G18', expect: '0' },
      ],
    },
  ],
};
