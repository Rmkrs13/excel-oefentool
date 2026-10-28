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

1. Maak `src/exercises/<naam>.ts` met een `Exercise` (zie `src/exercises/types.ts`): één of meer tabbladen in
   `sheets` (naam, afmetingen, startdata als `cells`, kolombreedtes) en `steps` met `checks`. Celverwijzingen in
   checks zonder tabblad slaan op het eerste tabblad; anders schrijf je `Blad2!B5` of `'Budget 2024'!B5`.
2. Voeg de oefening toe aan de juiste les in `LESSONS` in `src/exercises/index.ts`.
3. Verhoog `version` als je startdata of stappen wijzigt: bewaarde voortgang van studenten wordt dan gereset.

Beschikbare checks: `formula`, `value`, `usesFunction` (met `nestedIn`), `usesAbsoluteRef`, `format`,
`isText`, `rangeFilled`, `fillPattern` (één formule doortrekken over een bereik) en `predicate`.

## Oefening insluiten

Voeg `?embedmode` toe aan de link van een oefening, bv. `https://<site>/oefening/abs-rel?embedmode`. De pagina toont dan
enkel die oefening, zonder terugknop naar het overzicht. Handig om één oefening in een iframe of een leerplatform te plaatsen.

## Hosten op Netlify

`netlify.toml` staat klaar (build `npm run build`, publish `dist`, SPA-redirect, functions in `netlify/functions`).
Koppel de repo aan Netlify of deploy vanuit de map met `netlify deploy --prod`.

## Statistieken (/stats)

De tool telt anoniem hoe er geoefend wordt. Elke browser krijgt een willekeurig id in localStorage; er worden geen
namen, accounts of IP-adressen bewaard. Per gebruiker wordt bijgehouden: bezoeken (met verwijzende site, en of de tool
in een iframe of met `?embedmode` draait), per oefening geopend / stappen juist / afgemaakt / resets (met timestamps), en in
welke uren er activiteit was (Belgische tijd). Een oefening telt één keer als afgemaakt per poging: een reset start een nieuwe
poging, een cel breken en herstellen niet. Op `/stats` zie je per oefening zowel het aantal gebruikers dat ze afmaakte als het
totale aantal keer afgemaakt. De gegevens staan in Netlify Blobs (store `analytics`, één blob per gebruiker).

- `netlify/functions/track.mts` ontvangt events van de browser op `/api/track`.
- `netlify/functions/stats.mts` geeft de (geanonimiseerde) gegevens terug op `/api/stats`, enkel met het juiste wachtwoord.
- De pagina `/stats` toont tegels, een tabel per oefening (klik op een rij voor de stappen), actieve gebruikers per dag,
  een heatmap per weekdag en uur, en de herkomst van de bezoeken. Een periodefilter staat bovenaan. Onderaan staat een
  knop die alle statistieken wist (met bevestiging; `DELETE /api/stats`).

Instellen: zet op Netlify de omgevingsvariabele `STATS_PASSWORD` (Site configuration → Environment variables) en
deploy opnieuw. Zonder die variabele weigert `/api/stats` alles. Lokaal testen:

```bash
STATS_PASSWORD=test npm run dev:netlify   # Vite + functions + lokale Blobs-sandbox op http://localhost:8888
```

Goed om te weten:

- De gewone `npm run dev` heeft geen functions; events worden dan stil genegeerd.
- Een pagina die de tool insluit kan via haar Referrer-Policy haar adres verbergen; het bezoek telt dan als "direct",
  maar "in een iframe" wordt wel geteld.
- Chrome en Safari geven een iframe een aparte opslag per inbeddende site. Een student die zowel via een leerplatform
  als rechtstreeks oefent, telt daardoor als twee gebruikers.
- Bezoeken aan `/stats` zelf worden niet geteld.

## Licentie

GPL-3.0. De formule-engine is [HyperFormula](https://hyperformula.handsontable.com) (GPLv3).
