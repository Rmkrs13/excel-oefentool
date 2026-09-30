# Excel oefenen

Webtool waarin studenten Excel-oefeningen maken in een mini-spreadsheet in de browser.
Gedraagt zich als een Nederlandstalige Excel: functies zoals `SOM`, `GEMIDDELDE`, `AFRONDEN`,
argumenten gescheiden met `;`, decimalen met `,`. Elke oefening heeft stappen die automatisch
worden nagekeken. Voortgang wordt in de browser bewaard (localStorage).

## Ontwikkelen

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # Vitest
npm run build     # productie-build in dist/
```

## Oefening toevoegen

1. Maak `src/exercises/<naam>.ts` met een `Exercise` (zie `src/exercises/types.ts`): startdata als `cells`,
   kolombreedtes, en `steps` met `checks`.
2. Voeg de oefening toe aan `EXERCISES` in `src/exercises/index.ts`.
3. Verhoog `version` als je startdata of stappen wijzigt: bewaarde voortgang van studenten wordt dan gereset.

Beschikbare checks: `formula`, `value`, `usesFunction` (met `nestedIn`), `usesAbsoluteRef`, `format`,
`isText`, `rangeFilled`, `fillPattern` (één formule doortrekken over een bereik) en `predicate`.

## Hosten op Netlify

`netlify.toml` staat klaar (build `npm run build`, publish `dist`, SPA-redirect). Koppel de repo aan Netlify
of deploy vanuit de map met `netlify deploy --prod`.

## Licentie

GPL-3.0. De formule-engine is [HyperFormula](https://hyperformula.handsontable.com) (GPLv3).
