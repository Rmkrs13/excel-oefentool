/** Functies in de volgorde waarin ze in de les aan bod komen. */
export const TAUGHT_FUNCTIONS = ['SOM', 'GEMIDDELDE', 'MEDIAAN', 'MIN', 'MAX', 'AFRONDEN', 'AANTALARG', 'AANTAL'];

export const MAX_SUGGESTIONS = 8;

/**
 * Suggesties voor een prefix: eerst de aangeleerde functies (in leervolgorde), dan de rest alfabetisch.
 * `allowed` beperkt de lijst tot een whitelist (per oefening).
 */
export function matchFunctions(prefix: string, all: string[], taught: string[] = TAUGHT_FUNCTIONS, allowed?: string[]): string[] {
  const p = prefix.toUpperCase();
  if (!p) return [];
  const pool = allowed ? all.filter((n) => allowed.includes(n)) : all;
  const first = taught.filter((n) => n.startsWith(p) && pool.includes(n));
  const rest = pool.filter((n) => n.startsWith(p) && !first.includes(n)).sort();
  return [...first, ...rest].slice(0, MAX_SUGGESTIONS);
}
