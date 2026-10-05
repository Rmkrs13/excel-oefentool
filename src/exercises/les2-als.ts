import type { A1, CellData, Exercise } from './types';

/** Coopertest (12 minuten lopen): naam en gelopen afstand in meter. */
const lopers: Array<[string, number]> = [
  ['Aerts', 2650],
  ['Baeten', 2180],
  ['Claes', 2920],
  ['De Wit', 2400],
  ['Geerts', 1950],
  ['Hermans', 2780],
  ['Jacobs', 2310],
  ['Lemmens', 3050],
  ['Peeters', 2560],
  ['Willems', 2090],
];

const cells: Record<A1, CellData> = {
  A1: { raw: 'Coopertest 1 LOBR', style: { bold: true } },
  A2: { raw: 'Norm om te slagen (m):' },
  C2: { raw: '2400' },
  A4: { raw: 'Nr', style: { bold: true } },
  B4: { raw: 'Naam', style: { bold: true } },
  C4: { raw: 'Afstand (m)', style: { bold: true } },
  D4: { raw: 'Geslaagd?', style: { bold: true } },
  E4: { raw: 'Bonuspunt', style: { bold: true } },
  F4: { raw: 'Niveau', style: { bold: true } },
  A16: { raw: 'Aantal geslaagd:' },
};
lopers.forEach(([naam, afstand], i) => {
  const r = 5 + i;
  cells[`A${r}`] = { raw: String(i + 1) };
  cells[`B${r}`] = { raw: naam };
  cells[`C${r}`] = { raw: String(afstand) };
});

const geslaagd = lopers.map(([, m]) => (m >= 2400 ? 'geslaagd' : 'niet geslaagd'));
const bonus = lopers.map(([, m]) => (m >= 2800 ? 1 : 0));
const niveau = lopers.map(([, m]) => (m < 2000 ? 'basis' : m < 2600 ? 'gevorderd' : 'expert'));

export const les2Als: Exercise = {
  id: 'les2-als',
  version: 1,
  title: 'Voorwaarden met ALS',
  intro: 'De resultaten van de Coopertest van 1 LOBR. Laat Excel zelf beslissen wie geslaagd is, wie een bonuspunt krijgt en welk niveau elke loper haalt.',
  sheets: [{ name: 'Coopertest', rows: 18, cols: 8, cells, colWidths: { A: 20, B: 12, C: 12, D: 14, E: 11, F: 11 } }],
  steps: [
    {
      id: 'geslaagd',
      title: 'Geslaagd of niet: een eenvoudige ALS',
      text: 'Zet in **D5** een formule met **ALS** die "geslaagd" toont als de afstand in C5 groter is dan of gelijk aan de norm in **C2**, en anders "niet geslaagd". Trek door tot **D14**. Let op: de norm staat in één cel, dus die verwijzing moet vast staan.',
      hint: 'Een ALS heeft drie delen, gescheiden door puntkomma’s: de voorwaarde, wat er komt als ze waar is, wat er komt als ze onwaar is: `=ALS(C5>=$C$2;"geslaagd";"niet geslaagd")`. Tekst staat altijd tussen aanhalingstekens.',
      checks: [
        { type: 'usesFunction', cell: 'D5', fn: 'ALS' },
        { type: 'usesAbsoluteRef', cell: 'D5', ref: '$C$2' },
        { type: 'rangeFilled', range: 'D5:D14', values: geslaagd },
      ],
    },
    {
      id: 'bonus',
      title: 'Een getal als resultaat',
      text: 'Wie 2800 m of meer loopt, krijgt 1 bonuspunt, de anderen 0. Zet de formule in **E5** en trek door tot **E14**. Getallen zet je niet tussen aanhalingstekens.',
      checks: [
        { type: 'usesFunction', cell: 'E5', fn: 'ALS' },
        { type: 'rangeFilled', range: 'E5:E14', values: bonus },
      ],
    },
    {
      id: 'niveau',
      title: 'Drie mogelijkheden: ALS in ALS',
      text: 'Bepaal in **F5** het niveau: minder dan 2000 m is "basis", minder dan 2600 m is "gevorderd", de rest is "expert". Met één ALS kun je maar twee uitkomsten geven, dus zet een tweede ALS in het "anders"-deel van de eerste. Trek door tot **F14**.',
      hint: '`=ALS(C5<2000;"basis";ALS(C5<2600;"gevorderd";"expert"))`. Excel kijkt eerst naar de eerste voorwaarde; alleen als die onwaar is, bekijkt het de tweede.',
      checks: [
        { type: 'usesFunction', cell: 'F5', fn: 'ALS', nestedIn: 'ALS' },
        { type: 'rangeFilled', range: 'F5:F14', values: niveau },
      ],
    },
    {
      id: 'aantal',
      title: 'Tellen hoeveel er geslaagd zijn',
      text: 'Bereken in **C16** hoeveel lopers geslaagd zijn. Tip: in kolom E staat voor elke loper een 1 of 0... maar dat is het bonuspunt. Gebruik liever **AANTAL.ALS** op kolom D: `=AANTAL.ALS(D5:D14;"geslaagd")`.',
      checks: [
        { type: 'usesFunction', cell: 'C16', fn: 'AANTAL.ALS' },
        { type: 'value', cell: 'C16', expect: geslaagd.filter((g) => g === 'geslaagd').length },
      ],
    },
  ],
};
