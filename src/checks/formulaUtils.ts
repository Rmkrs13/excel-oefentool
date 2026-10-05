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

/** Staat `inner(` (bv. GEMIDDELDE) ergens binnen de haakjes van een aanroep van `outer(` (bv. AFRONDEN)? */
export function hasNested(canonical: string, outer: string, inner: string): boolean {
  const outerRe = new RegExp(`(^|[^A-Z0-9.])${escapeRe(outer)}\\(`, 'g');
  const innerRe = new RegExp(`(^|[^A-Z0-9.])${escapeRe(inner)}\\(`);
  for (const m of canonical.matchAll(outerRe)) {
    const start = (m.index ?? 0) + m[0].length; // positie net na de '('
    let depth = 1;
    let inString = false;
    for (let i = start; i < canonical.length; i++) {
      const ch = canonical[i];
      if (ch === '"') inString = !inString;
      if (inString) continue;
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) {
          if (innerRe.test(canonical.slice(start, i).replace(/"[^"]*"/g, '""'))) return true;
          break;
        }
      }
    }
    if (depth > 0 && innerRe.test(canonical.slice(start).replace(/"[^"]*"/g, '""'))) return true;
  }
  return false;
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

/**
 * Vult ontbrekende sluithaakjes aan, zoals Excel doet bij het bevestigen van een formule.
 * Haakjes binnen stringliterals tellen niet mee.
 */
export function autoCloseParens(formula: string): string {
  if (!formula.startsWith('=')) return formula;
  let depth = 0;
  let inString = false;
  for (const ch of formula) {
    if (ch === '"') inString = !inString;
    else if (!inString && ch === '(') depth++;
    else if (!inString && ch === ')' && depth > 0) depth--;
  }
  return depth > 0 ? formula + ')'.repeat(depth) : formula;
}
