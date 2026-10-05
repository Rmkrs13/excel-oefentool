import type { A1, CellData, CheckContext, Exercise } from './types';

const ploegen: Array<[string, number]> = [
  ['Real Madrid', 500],
  ['Bayern M', 400],
  ['AC Milan', 300],
  ['Chelsea', 200],
];

const cells: Record<A1, CellData> = {
  B2: { raw: 'Op te zoeken waarde', style: { bold: true } },
  C2: { raw: 'Bayern M' },
  B4: { raw: 'Formule', style: { bold: true } },
  C4: { raw: 'Budget', style: { bold: true } },
  B5: { raw: 'X.ZOEKEN' },
  B6: { raw: 'VERT.ZOEKEN' },
  B7: { raw: 'X.ZOEKEN met melding' },
  E4: { raw: 'Ploeg', style: { bold: true } },
  F4: { raw: 'Budget', style: { bold: true } },
};
ploegen.forEach(([ploeg, budget], i) => {
  cells[`E${5 + i}`] = { raw: ploeg };
  cells[`F${5 + i}`] = { raw: String(budget) };
});

/** Verwacht budget voor de ploeg die in C2 staat, of null als die niet in de tabel staat. */
function expectedBudget(ctx: CheckContext): number | null {
  const club = String(ctx.value('C2') ?? '').trim().toLowerCase();
  for (let i = 0; i < ploegen.length; i++) {
    const naam = String(ctx.value(`E${5 + i}`) ?? '').trim().toLowerCase();
    if (naam === club) {
      const b = ctx.value(`F${5 + i}`);
      return typeof b === 'number' ? b : null;
    }
  }
  return null;
}

/**
 * Klopt de zoekformule in `cell` met de huidige ploeg in C2?
 * Bestaat de ploeg: de cel toont haar budget. Bestaat ze niet: de cel geeft #N/B (of `fallback`, als die is opgegeven).
 * Zo blijven de stappen juist, welke ploeg er ook in C2 staat.
 */
function lookupOk(ctx: CheckContext, cell: string, fallback?: string): boolean {
  const expected = expectedBudget(ctx);
  if (expected !== null) return ctx.value(cell) === expected;
  if (fallback !== undefined) return String(ctx.value(cell) ?? '').trim().toLowerCase() === fallback;
  return ctx.errorText(cell) === '#N/B';
}

const LOOKUP_MSG = (cell: string) => `${cell} geeft niet het budget van de ploeg in C2 (of #N/B als die ploeg niet in de tabel staat).`;

export const les2Zoeken: Exercise = {
  id: 'les2-zoeken',
  version: 1,
  title: 'Opzoeken met X.ZOEKEN en VERT.ZOEKEN',
  intro: 'Vier voetbalploegen met hun budget. Zoek het budget van de ploeg in C2 op met een zoekfunctie, zodat de formule blijft kloppen als je een andere ploeg intypt.',
  sheets: [{ name: 'Budgetten', rows: 12, cols: 8, cells, colWidths: { B: 22, C: 14, E: 14, F: 10 } }],
  steps: [
    {
      id: 'xzoeken',
      title: 'X.ZOEKEN',
      text: 'Zoek in **C5** het budget op van de ploeg in **C2** met **X.ZOEKEN**: wat zoek je (C2), waar zoek je (de ploegnamen E5:E8), wat wil je terugkrijgen (de budgetten F5:F8).',
      hint: '`=X.ZOEKEN(C2;E5:E8;F5:F8)`. Het zoekbereik en het resultaatbereik zijn even lang en liggen naast elkaar.',
      checks: [
        { type: 'usesFunction', cell: 'C5', fn: 'X.ZOEKEN' },
        { type: 'predicate', label: 'C5 geeft het budget van de ploeg in C2', message: LOOKUP_MSG('C5'), test: (ctx) => lookupOk(ctx, 'C5') },
      ],
    },
    {
      id: 'vertzoeken',
      title: 'VERT.ZOEKEN',
      text: 'Zoek in **C6** hetzelfde budget op met de klassieke **VERT.ZOEKEN**: wat zoek je (C2), de hele tabel (E5:F8), het kolomnummer van het resultaat binnen die tabel (2), en **ONWAAR** omdat je een exacte overeenkomst wilt.',
      hint: '`=VERT.ZOEKEN(C2;E5:F8;2;ONWAAR)`. De zoekwaarde moet altijd in de eerste kolom van de tabel staan.',
      checks: [
        { type: 'usesFunction', cell: 'C6', fn: 'VERT.ZOEKEN' },
        {
          type: 'predicate',
          label: 'C6 geeft het budget van de ploeg in C2',
          message: LOOKUP_MSG('C6') + ' Staat ONWAAR (of 0) als vierde argument?',
          test: (ctx) => lookupOk(ctx, 'C6'),
        },
      ],
    },
    {
      id: 'andere',
      title: 'Een andere ploeg opzoeken',
      text: 'Typ in **C2** een andere ploeg uit de tabel, bijvoorbeeld **Chelsea**. Beide formules moeten nu het budget van die ploeg tonen, zonder dat je ze aanpast.',
      checks: [
        {
          type: 'predicate',
          label: 'C2 bevat een andere ploeg dan Bayern M',
          message: 'Typ in C2 een andere ploeg (bijvoorbeeld Chelsea).',
          test: (ctx) => String(ctx.value('C2') ?? '').trim().toLowerCase() !== 'bayern m' && ctx.value('C2') !== null && ctx.value('C2') !== '',
        },
        {
          type: 'predicate',
          label: 'C5 en C6 volgen mee',
          message: 'C5 en C6 volgen de ploeg in C2 niet. Verwijzen beide formules naar C2?',
          test: (ctx) => lookupOk(ctx, 'C5') && lookupOk(ctx, 'C6'),
        },
      ],
    },
    {
      id: 'melding',
      title: 'Wat als de ploeg niet bestaat?',
      text: 'Zet in **C7** opnieuw een **X.ZOEKEN**, maar geef als vierde argument de tekst "niet gevonden". Typ daarna in **C2** een ploeg die niet in de tabel staat (bijvoorbeeld **Ajax**): C7 toont de melding, terwijl C5 en C6 een foutwaarde #N/B geven.',
      hint: '`=X.ZOEKEN(C2;E5:E8;F5:F8;"niet gevonden")`. Het vierde argument van X.ZOEKEN is wat je terugkrijgt als er niets gevonden wordt.',
      checks: [
        { type: 'usesFunction', cell: 'C7', fn: 'X.ZOEKEN' },
        {
          type: 'predicate',
          label: 'C7 heeft "niet gevonden" als vierde argument',
          message: 'Geef in C7 de tekst "niet gevonden" (tussen aanhalingstekens) als vierde argument van X.ZOEKEN.',
          test: (ctx) => /"niet gevonden"/i.test(ctx.raw('C7')),
        },
        {
          type: 'predicate',
          label: 'C7 toont het budget, of "niet gevonden" voor een onbekende ploeg',
          message: 'C7 toont niet het juiste resultaat. Typ in C2 een ploeg die niet in de tabel staat (bv. Ajax): C7 moet dan "niet gevonden" tonen.',
          test: (ctx) => lookupOk(ctx, 'C7', 'niet gevonden'),
        },
      ],
    },
  ],
};
