import type { A1, CellData, Exercise } from './types';

const personen: Array<[string, string, 'm' | 'v']> = [
  ['Tim', 'Konings', 'm'],
  ['Cindy', 'Blommaert', 'v'],
  ['Kristof', 'Lanoote', 'm'],
  ['Pieter', 'Verhoeven', 'm'],
  ['Greet', 'Sips', 'v'],
  ['Tom', 'Vorsselmans', 'm'],
  ['Jessica', 'Luyten', 'v'],
  ['Bert', 'Heymans', 'm'],
  ['Karin', 'Andries', 'v'],
  ['Kelly', 'Vermeiren', 'v'],
];

const code = (v: string, a: string) => (v.slice(0, 2) + a.slice(1, 3)).toUpperCase() + String(a.length).padStart(2, '0');
const email = (v: string, a: string) => `${v}.${a}@firma.com`.toLowerCase();
const aanspreking = (v: string, a: string, g: string) => `${g === 'v' ? 'mevrouw' : 'de heer'} ${v[0]}. ${a}`;

const cells: Record<A1, CellData> = {
  A1: { raw: 'Voornaam', style: { bold: true } },
  B1: { raw: 'Achternaam', style: { bold: true } },
  C1: { raw: 'Geslacht', style: { bold: true } },
  D1: { raw: 'Code', style: { bold: true } },
  E1: { raw: 'E-mail', style: { bold: true } },
  F1: { raw: 'Aanspreking', style: { bold: true } },
  B13: { raw: 'mevrouw' },
  C13: { raw: 'v' },
  B14: { raw: 'de heer' },
  C14: { raw: 'm' },
};
personen.forEach(([v, a, g], i) => {
  const r = 2 + i;
  cells[`A${r}`] = { raw: v };
  cells[`B${r}`] = { raw: a };
  cells[`C${r}`] = { raw: g };
});
// Rij 2 is het voorbeeld, als gewone tekst.
cells.D2 = { raw: code('Tim', 'Konings') };
cells.E2 = { raw: email('Tim', 'Konings') };
cells.F2 = { raw: aanspreking('Tim', 'Konings', 'm') };

const rest = personen.slice(1);

export const les3Tekst: Exercise = {
  id: 'les3-tekst',
  version: 1,
  title: 'Tekstfuncties: code, e-mail en aanspreking',
  intro:
    'Bouw uit voornaam, achternaam en geslacht een personeelscode, een e-mailadres en een aanspreking. Rij 2 toont het voorbeeld. Bouw de formules stap voor stap op en plak stukken tekst aan elkaar met &.',
  sheets: [{ name: 'Tekstfuncties', rows: 16, cols: 7, cells, colWidths: { A: 12, B: 14, C: 9, D: 10, E: 26, F: 22 } }],
  steps: [
    {
      id: 'code',
      title: 'Personeelscode',
      text: 'Maak in **D3** de code van Cindy Blommaert, zoals in het voorbeeld TION07 voor Tim Konings: de eerste 2 letters van de voornaam, dan de 2e en 3e letter van de achternaam, alles in hoofdletters, gevolgd door het aantal letters van de achternaam in 2 cijfers. Gebruik **LINKS**, **DEEL**, **HOOFDLETTERS** en **LENGTE**, en trek door tot **D11**.',
      hint: '`=HOOFDLETTERS(LINKS(A3;2)&DEEL(B3;2;2))&TEKST(LENGTE(B3);"00")`. DEEL(tekst;begin;aantal) haalt letters uit het midden. TEKST(getal;"00") zet 7 om in "07".',
      checks: [
        { type: 'usesFunction', cell: 'D3', fn: 'LINKS' },
        { type: 'usesFunction', cell: 'D3', fn: 'DEEL' },
        { type: 'usesFunction', cell: 'D3', fn: 'HOOFDLETTERS' },
        { type: 'usesFunction', cell: 'D3', fn: 'LENGTE' },
        { type: 'rangeFilled', range: 'D3:D11', values: rest.map(([v, a]) => code(v, a)) },
      ],
    },
    {
      id: 'email',
      title: 'E-mailadres',
      text: 'Maak in **E3** het e-mailadres: voornaam, een punt, achternaam en `@firma.com`, alles in kleine letters. Gebruik **KLEINE.LETTERS** en plak de delen aan elkaar met **&**. Trek door tot **E11**.',
      hint: '`=KLEINE.LETTERS(A3&"."&B3&"@firma.com")`.',
      checks: [
        { type: 'usesFunction', cell: 'E3', fn: 'KLEINE.LETTERS' },
        { type: 'rangeFilled', range: 'E3:E11', values: rest.map(([v, a]) => email(v, a)) },
      ],
    },
    {
      id: 'aanspreking',
      title: 'Aanspreking',
      text: 'Maak in **F3** de aanspreking, zoals "de heer T. Konings": zoek met **X.ZOEKEN** het woord op dat bij het geslacht hoort in de hulptabel B13:C14 (let op: de letters staan in kolom C, de woorden in kolom B), dan een spatie, de eerste letter van de voornaam met **LINKS**, een punt, een spatie en de achternaam. Zet de hulptabel vast met `$` en trek door tot **F11**.',
      hint: '`=X.ZOEKEN(C3;$C$13:$C$14;$B$13:$B$14)&" "&LINKS(A3;1)&". "&B3`. Met VERT.ZOEKEN zou dit niet lukken, want die kan alleen in de eerste kolom zoeken.',
      checks: [
        { type: 'usesFunction', cell: 'F3', fn: 'X.ZOEKEN' },
        { type: 'usesFunction', cell: 'F3', fn: 'LINKS' },
        { type: 'rangeFilled', range: 'F3:F11', values: rest.map(([v, a, g]) => aanspreking(v, a, g)) },
      ],
    },
  ],
};
