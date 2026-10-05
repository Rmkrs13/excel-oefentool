import type { A1, CellData, Exercise } from './types';

const studenten: Array<[string, string]> = [
  ['Alvarez', 'Joery'],
  ['Bruyneels', 'Yannick'],
  ['Coppens', 'Karen'],
  ['Deman', 'Laurens'],
  ['Dils', 'Katrien'],
  ['Fransen', 'Oliver'],
  ['Jansen', 'Kobe'],
  ['Kanps', 'Jorien'],
  ['Kenis', 'Ward'],
  ['Kop', 'Dimi'],
  ['Maers', 'Jasper'],
  ['Vandevelde', 'Carolien'],
  ['Vekemans', 'Thomas'],
  ['Wilmsen', 'Kevin'],
];
const sem1: number[][] = [[10, 13, 14], [18, 14, 12], [10, 6, 8], [10, 19, 12], [4, 12, 13], [5, 10, 10], [12, 10, 10], [9, 12, 9], [3, 12, 7], [9, 14, 12], [6, 8, 2], [7, 5, 14], [9, 14, 12], [8, 6, 9]];
const sem2: number[][] = [[12, 10, 13], [18, 16, 15], [12, 6, 10], [12, 18, 13], [6, 14, 8], [5, 13, 8], [12, 11, 13], [10, 13, 10], [4, 13, 6], [15, 13, 16], [5, 10, 4], [5, 5, 16], [8, 15, 14], [10, 8, 10]];
const woonplaats: Record<string, string> = {
  Alvarez: 'Herentals', Bruyneels: 'Vosselaar', Coppens: 'Turnhout', Deman: 'Geel', Dils: 'Geel', Fransen: 'Herentals', Jansen: 'Geel',
  Kanps: 'Kasterlee', Kenis: 'Kasterlee', Kop: 'Turnhout', Maers: 'Geel', Vandevelde: 'Lille', Vekemans: 'Turnhout', Wilmsen: 'Turnhout',
};
/** Volgorde van de verwijstabel VZ: gesorteerd op woonplaats, zoals in het lesbestand. */
const vzVolgorde = ['Maers', 'Jansen', 'Deman', 'Dils', 'Fransen', 'Alvarez', 'Kenis', 'Kanps', 'Vandevelde', 'Vekemans', 'Kop', 'Coppens', 'Wilmsen', 'Bruyneels'];

function semesterSheet(name: string, titel: string, periode: string, punten: number[][], metFormules: boolean): Record<A1, CellData> {
  const cells: Record<A1, CellData> = {
    A1: { raw: 'klas:', style: { bold: true } },
    B1: { raw: '1 LOBR', style: { bold: true } },
    D1: { raw: 'Periode:', style: { bold: true } },
    F1: { raw: periode, style: { bold: true } },
    A2: { raw: titel, style: { bold: true } },
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
    H19: { raw: 'gemiddelde' },
    H20: { raw: 'mediaan' },
    A21: { raw: 'aantal studenten:' },
    A22: { raw: 'slechtste resultaat:' },
    A23: { raw: 'beste resultaat:' },
  };
  studenten.forEach(([naam, voornaam], i) => {
    const r = 5 + i;
    cells[`A${r}`] = { raw: String(i + 1) };
    cells[`B${r}`] = { raw: naam };
    cells[`C${r}`] = { raw: voornaam };
    if (punten.length) {
      cells[`D${r}`] = { raw: String(punten[i][0]), format: { kind: 'number', decimals: 1 } };
      cells[`E${r}`] = { raw: String(punten[i][1]), format: { kind: 'number', decimals: 1 } };
      cells[`F${r}`] = { raw: String(punten[i][2]), format: { kind: 'number', decimals: 1 } };
    }
    if (metFormules) cells[`G${r}`] = { raw: `=SOM(D${r}:F${r})`, format: { kind: 'number', decimals: 0 } };
  });
  if (metFormules) {
    for (const c of ['D', 'E', 'F', 'G']) {
      cells[`${c}19`] = { raw: `=GEMIDDELDE(${c}5:${c}18)`, format: { kind: 'number', decimals: 1 } };
      cells[`${c}20`] = { raw: `=MEDIAAN(${c}5:${c}18)`, format: { kind: 'number', decimals: 1 } };
    }
    cells.C21 = { raw: '=AANTALARG(B5:B18)' };
    cells.C22 = { raw: '=MIN(D5:F18)', format: { kind: 'number', decimals: 1 } };
    cells.C23 = { raw: '=MAX(D5:F18)', format: { kind: 'number', decimals: 1 } };
  }
  void name;
  return cells;
}

const totaalCells = semesterSheet('Totaal', 'Evaluatie totaal', 'jaar', [], false);
totaalCells.H3 = { raw: 'Percentage' };
totaalCells.I3 = { raw: 'Graad (ALS)' };
totaalCells.J3 = { raw: 'Graad (VERT.ZOEKEN)' };
totaalCells.K3 = { raw: 'Woonplaats' };

const graadCells: Record<A1, CellData> = {
  B2: { raw: '%', style: { bold: true } },
  C2: { raw: 'graad', style: { bold: true } },
  B3: { raw: '0', format: { kind: 'percent', decimals: 0 } },
  C3: { raw: 'onvoldoende' },
  B4: { raw: '0,5', format: { kind: 'percent', decimals: 0 } },
  C4: { raw: 'voldoende' },
  B5: { raw: '0,68', format: { kind: 'percent', decimals: 0 } },
  C5: { raw: 'onderscheiding' },
  B6: { raw: '0,78', format: { kind: 'percent', decimals: 0 } },
  C6: { raw: 'grote onderscheiding' },
};

const vzCells: Record<A1, CellData> = {
  B2: { raw: 'Achternaam', style: { bold: true } },
  C2: { raw: 'Voornaam', style: { bold: true } },
  D2: { raw: 'Woonplaats', style: { bold: true } },
};
vzVolgorde.forEach((naam, i) => {
  const r = 3 + i;
  vzCells[`B${r}`] = { raw: naam };
  vzCells[`C${r}`] = { raw: studenten.find(([n]) => n === naam)![1] };
  vzCells[`D${r}`] = { raw: woonplaats[naam] };
});

// Verwachte waarden
const jaar = sem1.map((row, i) => row.map((v, j) => v * 0.4 + sem2[i][j] * 0.6));
const totaal = jaar.map((row) => row.reduce((a, b) => a + b, 0));
const pct = totaal.map((t) => t / 60);
const graad = (p: number) => (p < 0.5 ? 'onvoldoende' : p < 0.68 ? 'voldoende' : p < 0.78 ? 'onderscheiding' : 'grote onderscheiding');
const graden = pct.map(graad);
const plaatsen = studenten.map(([n]) => woonplaats[n]);

export const les2Totaal: Exercise = {
  id: 'les2-totaal',
  version: 1,
  title: 'Rekenen over tabbladen: jaartotaal, graad en woonplaats',
  intro:
    'De punten van 1 LOBR voor semester 1 en semester 2 staan elk op een eigen tabblad. Bereken op het tabblad Totaal het gewogen jaarresultaat, het percentage, de graad (met ALS én met VERT.ZOEKEN) en zoek de woonplaats op.',
  sheets: [
    { name: 'Totaal', rows: 24, cols: 11, cells: totaalCells, colWidths: { A: 18, B: 12, C: 11, D: 11, E: 11, F: 11, G: 10, H: 12, I: 20, J: 22, K: 13 } },
    { name: 'semester1', rows: 24, cols: 9, cells: semesterSheet('semester1', 'Evaluatie januari', 'januari', sem1, true), colWidths: { A: 18, B: 12, C: 11, D: 11, E: 11, F: 11, G: 11, H: 12 } },
    { name: 'semester2', rows: 24, cols: 9, cells: semesterSheet('semester2', 'Evaluatie juni', 'juni', sem2, true), colWidths: { A: 18, B: 12, C: 11, D: 11, E: 11, F: 11, G: 11, H: 12 } },
    { name: 'Graad', rows: 8, cols: 5, cells: graadCells, colWidths: { C: 22 } },
    { name: 'VZ', rows: 18, cols: 6, cells: vzCells, colWidths: { B: 14, C: 12, D: 14 } },
  ],
  steps: [
    {
      id: 'gewogen',
      title: 'Jaarresultaat over twee tabbladen',
      text: 'Bereken op tabblad **Totaal** in **D5** het jaarresultaat voor Didactiek: semester 1 telt voor 40% mee, semester 2 voor 60%. De punten staan op de tabbladen **semester1** en **semester2**, telkens in dezelfde cel D5. Trek de formule door naar rechts tot F5 en naar beneden tot **F18**.',
      hint: 'Typ `=`, klik op het tabblad semester1 en dan op D5, typ `*0,4+`, klik op het tabblad semester2 en dan op D5, typ `*0,6` en druk op Enter. De formule wordt `=semester1!D5*0,4+semester2!D5*0,6`.',
      checks: [
        {
          type: 'predicate',
          label: 'D5 verwijst naar semester1 en semester2',
          message: 'D5 moet verwijzen naar de cel D5 op de tabbladen semester1 én semester2 (bv. semester1!D5).',
          test: (ctx) => {
            const f = ctx.formula('D5') ?? '';
            return f.includes('SEMESTER1!') && f.includes('SEMESTER2!');
          },
        },
        { type: 'rangeFilled', range: 'D5:F18', values: jaar.flat() },
      ],
    },
    {
      id: 'totaal',
      title: 'Totaal en percentage',
      text: 'Bereken in **G5** het totaal met **SOM** en in **H5** het percentage: het totaal gedeeld door 60. Trek beide door tot rij 18 en geef de percentages de notatie `0,0%`.',
      checks: [
        { type: 'fillPattern', range: 'G5:G18', anchor: 'G5', formula: '=SOM(D5:F5)' },
        { type: 'rangeFilled', range: 'H5:H18', values: pct },
        { type: 'format', range: 'H5:H18', expect: ['0,0%', '0%', '0,00%'] },
      ],
    },
    {
      id: 'graad-als',
      title: 'Graad met een geneste ALS',
      text: 'Bepaal in **I5** de graad op basis van het percentage in H5: minder dan 50% is "onvoldoende", minder dan 68% "voldoende", minder dan 78% "onderscheiding", en vanaf 78% "grote onderscheiding". Dat zijn vier uitkomsten, dus drie ALS-functies in elkaar. Trek door tot **I18**.',
      hint: '`=ALS(H5<0,5;"onvoldoende";ALS(H5<0,68;"voldoende";ALS(H5<0,78;"onderscheiding";"grote onderscheiding")))`. Percentages zijn getallen tussen 0 en 1: 50% is 0,5.',
      checks: [
        { type: 'usesFunction', cell: 'I5', fn: 'ALS', nestedIn: 'ALS' },
        { type: 'rangeFilled', range: 'I5:I18', values: graden },
      ],
    },
    {
      id: 'graad-vz',
      title: 'Graad met VERT.ZOEKEN en een verwijstabel',
      text: 'Op het tabblad **Graad** staat een verwijstabel met de ondergrens van elke graad. Bepaal in **J5** de graad met **VERT.ZOEKEN**: zoek H5 op in de tabel Graad!B3:C6 en geef kolom 2 terug. Laat het vierde argument weg (of zet WAAR): dan zoekt Excel de grootste ondergrens die kleiner is dan of gelijk aan het percentage. Zet de tabel vast met `$` en trek door tot **J18**. In Excel zou je dit bereik de naam "Graad" geven; hier gebruik je de absolute verwijzing.',
      hint: '`=VERT.ZOEKEN(H5;Graad!$B$3:$C$6;2)`. Bij benaderend zoeken moet de eerste kolom van de tabel oplopend gesorteerd zijn. Je kunt de tabel ook aanklikken: klik op het tabblad Graad, sleep over B3:C6 en druk op F4.',
      checks: [
        { type: 'usesFunction', cell: 'J5', fn: 'VERT.ZOEKEN' },
        {
          type: 'predicate',
          label: 'J5 gebruikt een absolute verwijzing naar de tabel op het tabblad Graad',
          message: 'J5 moet de tabel op het tabblad Graad gebruiken, vastgezet met $ (bv. Graad!$B$3:$C$6).',
          test: (ctx) => {
            const f = ctx.formula('J5') ?? '';
            return f.includes('GRAAD!') && /\$[A-Z]\$\d+:\$[A-Z]\$\d+/.test(f);
          },
        },
        { type: 'rangeFilled', range: 'J5:J18', values: graden },
      ],
    },
    {
      id: 'woonplaats',
      title: 'Woonplaats opzoeken op een ander tabblad',
      text: 'Op het tabblad **VZ** staat per student de woonplaats, in een andere volgorde. Zoek in **K5** de woonplaats op aan de hand van de achternaam in B5, met **X.ZOEKEN** of **VERT.ZOEKEN** (exact zoeken!). Je mag niets aan de verwijstabel veranderen. Trek door tot **K18**.',
      hint: '`=X.ZOEKEN(B5;VZ!$B$3:$B$16;VZ!$D$3:$D$16)` of `=VERT.ZOEKEN(B5;VZ!$B$3:$D$16;3;ONWAAR)`.',
      checks: [
        {
          type: 'predicate',
          label: 'K5 zoekt op het tabblad VZ met X.ZOEKEN of VERT.ZOEKEN',
          message: 'K5 moet met X.ZOEKEN of VERT.ZOEKEN zoeken in de tabel op het tabblad VZ.',
          test: (ctx) => {
            const f = ctx.formula('K5') ?? '';
            return f.includes('VZ!') && (f.includes('X.ZOEKEN(') || f.includes('VERT.ZOEKEN('));
          },
        },
        { type: 'rangeFilled', range: 'K5:K18', values: plaatsen },
        {
          type: 'predicate',
          label: 'De verwijstabel op VZ is ongewijzigd',
          message: 'Je hebt de tabel op het tabblad VZ gewijzigd. Zet ze terug zoals ze was.',
          test: (ctx) => vzVolgorde.every((naam, i) => ctx.value(`VZ!B${3 + i}`) === naam && ctx.value(`VZ!D${3 + i}`) === woonplaats[naam]),
        },
      ],
    },
    {
      id: 'statistieken',
      title: 'Statistieken onder de tabel',
      text: 'Vul ook op het tabblad Totaal de statistieken aan: **GEMIDDELDE** in rij 19 en **MEDIAAN** in rij 20 (D tot G), het aantal studenten in **C21** met **AANTALARG**, en het slechtste en beste resultaat in **C22** en **C23** met **MIN** en **MAX** over D5:F18.',
      checks: [
        { type: 'fillPattern', range: 'D19:G19', anchor: 'D19', formula: '=GEMIDDELDE(D5:D18)' },
        { type: 'fillPattern', range: 'D20:G20', anchor: 'D20', formula: '=MEDIAAN(D5:D18)' },
        { type: 'formula', cell: 'C21', expect: ['=AANTALARG(B5:B18)', '=AANTALARG(C5:C18)', '=AANTALARG(A5:A18)'] },
        { type: 'formula', cell: 'C22', expect: ['=MIN(D5:F18)'] },
        { type: 'formula', cell: 'C23', expect: ['=MAX(D5:F18)'] },
      ],
    },
  ],
};
