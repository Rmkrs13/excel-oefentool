/** Canonieke vorm van een formule: hoofdletters en geen spaties buiten stringliterals. */
export function canonicalFormula(formula: string): string {
  let out = '';
  let inString = false;
  for (const ch of formula) {
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString) {
      out += ch;
      continue;
    }
    if (ch === ' ' || ch === '\t') continue;
    out += ch.toUpperCase();
  }
  return out;
}

/** Namen van alle functies die in de (canonieke) formule worden aangeroepen. */
export function functionsUsed(canonical: string): string[] {
  const names: string[] = [];
  for (const m of canonical.matchAll(/([A-Z][A-Z0-9.]*)\(/g)) names.push(m[1]);
  return names;
}

/** Is `inner` (bv. GEMIDDELDE) direct genest in `outer` (bv. AFRONDEN)? */
export function hasNested(canonical: string, outer: string, inner: string): boolean {
  const re = new RegExp(`${escapeRe(outer)}\\(${escapeRe(inner)}\\(`);
  return re.test(canonical);
}

/** Bevat de formule deze verwijzing exact ($-tekens inbegrepen) als los token? */
export function hasRef(canonical: string, ref: string): boolean {
  const re = new RegExp(`(^|[^A-Z0-9$.])${escapeRe(ref.toUpperCase())}(?![A-Z0-9])`);
  return re.test(canonical);
}

/** Alle celverwijzingen (zonder bereikuitbreiding) in de formule. */
export function refsIn(canonical: string): string[] {
  const out: string[] = [];
  const stripped = canonical.replace(/"[^"]*"/g, '""');
  for (const m of stripped.matchAll(/(?<![A-Z0-9.])(\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?)(?![A-Z0-9(])/g)) out.push(m[1]);
  return out;
}

export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
