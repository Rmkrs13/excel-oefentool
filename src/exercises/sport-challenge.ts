import type { A1, CellData, Exercise } from './types';

const visitors: number[][] = [
  [2845, 4120, 3380, 612, 905],
  [3120, 4655, 3510, 588, 1040],
  [3290, 5210, 3445, 540, 1185],
  [2410, 4380, 2960, 475, 1230],
  [3350, 5480, 4725, 505, 1310],
  [3180, 5025, 4210, 530, 1160],
  [3065, 4790, 3895, 640, 1020],
  [2730, 4310, 3540, 755, 860],
  [2295, 3960, 3120, 890, 715],
  [1920, 4470, 2885, 935, 640],
];
const zalen = ['Sporthal', 'Zwembad', 'Fitness', 'Padel', 'Klimmuur'];
const tarieven = ['3,5', '5,2', '7,95', '11', '9,5'];

const cells: Record<A1, CellData> = {
  A1: { raw: 'Gegevens sportcentrum', style: { bold: true } },
  A2: { raw: 'Naam' },
  B2: { raw: 'Sportcentrum De Schans' },
  A3: { raw: 'Adres' },
  B3: { raw: 'Parklaan 12' },
  A4: { raw: 'Postcode' },
  B4: { raw: '2300' },
  A5: { raw: 'Gemeente' },
  B5: { raw: 'Turnhout' },
  A6: { raw: 'Telefoon' },
  B6: { raw: '14123456' },
  A7: { raw: 'Openingsdatum' },
  B7: { raw: '42625' },
  A9: { raw: 'Bezoekers per zaal', style: { bold: true } },
  A10: { raw: 'Maand', style: { bold: true } },
  A11: { raw: 'september' },
  A21: { raw: 'Totaal', style: { bold: true } },
  A23: { raw: 'Gemiddelde per maand' },
  A24: { raw: 'Gemiddelde, afgerond (AFRONDEN)' },
  A25: { raw: 'Mediaan' },
  A26: { raw: 'Minimum' },
  A27: { raw: 'Maximum' },
  A28: { raw: 'Aandeel in totaal aantal bezoekers' },
  A30: { raw: 'Tarief per bezoek', style: { bold: true } },
  A32: { raw: 'Omzet per zaal (aantal bezoekers × tarief)', style: { bold: true } },
  A33: { raw: 'Maand', style: { bold: true } },
  G33: { raw: 'Totaal', style: { bold: true } },
  A34: { raw: 'september' },
  A44: { raw: 'Totaal', style: { bold: true } },
};
zalen.forEach((z, i) => {
  const col = 'BCDEF'[i];
  cells[`${col}10`] = { raw: z, style: { bold: true } };
  cells[`${col}33`] = { raw: z, style: { bold: true } };
  cells[`${col}30`] = { raw: tarieven[i] };
});
visitors.forEach((row, r) => row.forEach((v, c) => (cells[`${'BCDEF'[c]}${11 + r}`] = { raw: String(v) })));

const maanden = ['oktober', 'november', 'december', 'januari', 'februari', 'maart', 'april', 'mei', 'juni'];

export const sportChallenge: Exercise = {
  id: 'sport',
  version: 1,
  title: 'Challenge: Sportcentrum De Schans',
  intro:
    'Je loopt stage bij Sportcentrum De Schans en krijgt een ruwe export van de bezoekers per zaal. Zet alles op punt: gegevens, tabel, totalen, statistieken en omzet.',
  sheet: { rows: 46, cols: 8, cells, colWidths: { A: 30, B: 12, C: 11, D: 11, E: 11, F: 11, G: 12 } },
  steps: [
    {
      id: 'telefoon',
      title: 'Telefoonnummer als tekst',
      text: 'Het telefoonnummer in **B6** staat als 14123456: de voorloopnul is verdwenen omdat Excel het als getal las. Zorg dat er `014 12 34 56` staat, als **tekst**. Kies zelf ook of de postcode in B4 een getal of tekst moet zijn (we rekenen er nooit mee).',
      hint: 'Geef de cel eerst de notatie **Tekst** en typ dan het nummer, of begin de invoer met een apostrof: `\'014 12 34 56`.',
      checks: [{ type: 'isText', cell: 'B6', expect: '014 12 34 56' }],
    },
    {
      id: 'datum',
      title: 'Openingsdatum tonen als datum',
      text: 'In **B7** staat 42625. Dat is een datum, opgeslagen als getal (het aantal dagen sinds 1 januari 1900). Geef de cel de notatie **Datum** (dd/mm/jjjj). Welke datum verschijnt?',
      checks: [
        { type: 'format', range: 'B7', expect: 'dd/mm/jjjj' },
        { type: 'value', cell: 'B7', expect: 42625 },
      ],
    },
    {
      id: 'maanden',
      title: 'Maanden aanvullen met de vulgreep',
      text: 'Vul onder **september** (A11) de maanden oktober tot en met juni aan met de vulgreep, tot **A20**.',
      checks: [{ type: 'rangeFilled', range: 'A12:A20', values: maanden }],
    },
    {
      id: 'totaal-kolom',
      title: 'Kolom Totaal',
      text: 'Typ **Totaal** in **G10** en bereken in **G11** het totaal aantal bezoekers van september met **SOM**. Trek door tot **G20**.',
      checks: [
        { type: 'rangeFilled', range: 'G10', values: ['Totaal'] },
        { type: 'fillPattern', range: 'G11:G20', anchor: 'G11', formula: '=SOM(B11:F11)' },
      ],
    },
    {
      id: 'totaal-rij',
      title: 'Rij Totaal',
      text: 'Bereken in **B21** het totaal aantal bezoekers van de Sporthal over het hele seizoen met **SOM** en trek door tot **G21**.',
      checks: [{ type: 'fillPattern', range: 'B21:G21', anchor: 'B21', formula: '=SOM(B11:B20)' }],
    },
    {
      id: 'statistieken',
      title: 'Gemiddelde, mediaan, minimum en maximum',
      text: 'Bereken per zaal (en voor de kolom Totaal) in rij **23** het gemiddelde (**GEMIDDELDE**), in rij **25** de mediaan (**MEDIAAN**), in rij **26** het minimum (**MIN**) en in rij **27** het maximum (**MAX**) van de maandcijfers B11:B20. Schrijf telkens één formule in kolom B en trek door tot G.',
      checks: [
        { type: 'fillPattern', range: 'B23:G23', anchor: 'B23', formula: '=GEMIDDELDE(B11:B20)' },
        { type: 'fillPattern', range: 'B25:G25', anchor: 'B25', formula: '=MEDIAAN(B11:B20)' },
        { type: 'fillPattern', range: 'B26:G26', anchor: 'B26', formula: '=MIN(B11:B20)' },
        { type: 'fillPattern', range: 'B27:G27', anchor: 'B27', formula: '=MAX(B11:B20)' },
      ],
    },
    {
      id: 'afronden',
      title: 'Afgerond gemiddelde (genest)',
      text: 'Bereken in rij **24** het gemiddelde afgerond op een geheel getal met de geneste functie `=AFRONDEN(GEMIDDELDE(B11:B20);0)` en trek door tot G24. Vergelijk met rij 23: daar haal je decimalen alleen via de opmaak weg, de waarde blijft 2820,5.',
      checks: [
        { type: 'usesFunction', cell: 'B24', fn: 'GEMIDDELDE', nestedIn: 'AFRONDEN' },
        { type: 'fillPattern', range: 'B24:G24', anchor: 'B24', formula: '=AFRONDEN(GEMIDDELDE(B11:B20);0)' },
      ],
    },
    {
      id: 'aandeel',
      title: 'Aandeel per zaal in procent',
      text: 'Bereken in **B28** het aandeel van de Sporthal in het totaal aantal bezoekers: het totaal van de zaal (B21) gedeeld door het grote totaal (G21). Schrijf één formule, zet de juiste verwijzing vast met `$`, trek door tot **G28** en toon het als percentage met 1 decimaal.',
      hint: 'Welke verwijzing moet vast blijven staan als je naar rechts sleept? Het grote totaal: `$G$21`. Gebruik F4.',
      checks: [
        { type: 'usesAbsoluteRef', cell: 'B28', ref: '$G$21' },
        { type: 'fillPattern', range: 'B28:G28', anchor: 'B28', formula: '=B21/$G$21' },
        { type: 'format', range: 'B28:G28', expect: ['0,0%', '0%', '0,00%'] },
      ],
    },
    {
      id: 'notaties',
      title: 'Getalnotaties: duizendtallen en valuta',
      text: 'Geef de bezoekersaantallen en totalen in **B11:G21** een scheidingsteken voor duizendtallen zonder decimalen (3.380). Geef de tarieven in **B30:F30** de valutanotatie € met 2 decimalen.',
      checks: [
        { type: 'format', range: 'B11:G21', expect: '#.##0' },
        { type: 'format', range: 'B30:F30', expect: '€ #.##0,00' },
      ],
    },
    {
      id: 'omzet',
      title: 'Omzet per zaal',
      text: 'Vul in de tabel onderaan de maanden aan (**A35:A43**). Bereken in **B34** de omzet van de Sporthal in september: aantal bezoekers (B11) maal het tarief (B30). Schrijf één formule die je over de hele tabel **B34:F43** kunt doortrekken: naar rechts moet de kolom van het tarief mee schuiven, naar beneden moet rij 30 vast blijven staan. Voeg ook de totalen toe in **G34:G43** en **B44:G44** (SOM) en geef de omzet de notatie € zonder decimalen.',
      hint: 'Denk terug aan de maaltafels: `=B11*B$30` zet enkel de rij van het tarief vast. Trek B34 eerst naar rechts tot F34, en dan B34:F34 naar beneden tot rij 43.',
      checks: [
        { type: 'rangeFilled', range: 'A35:A43', values: maanden },
        { type: 'fillPattern', range: 'B34:F43', anchor: 'B34', formula: '=B11*B$30' },
        { type: 'fillPattern', range: 'G34:G43', anchor: 'G34', formula: '=SOM(B34:F34)' },
        { type: 'fillPattern', range: 'B44:G44', anchor: 'B44', formula: '=SOM(B34:B43)' },
        { type: 'format', range: 'B34:G44', expect: ['€ #.##0', '€ #.##0,00'] },
      ],
    },
  ],
};
