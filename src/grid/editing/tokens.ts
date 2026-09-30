/** Helpers die bepalen wat de student aan het typen is in een formule. */

const OPERATOR_CHARS = new Set(['=', '(', ';', '+', '-', '*', '/', '^', '&', '<', '>', ':', ',']);

/** Aantal aanhalingstekens vóór `pos` is oneven -> we zitten binnen een stringliteral. */
export function insideString(text: string, pos: number): boolean {
  let count = 0;
  for (let i = 0; i < pos && i < text.length; i++) if (text[i] === '"') count++;
  return count % 2 === 1;
}

export interface FunctionToken {
  start: number;
  prefix: string;
}

/**
 * Het functienaam-fragment dat direct vóór de caret staat, bv. '=SO|' -> {start:1, prefix:'SO'}.
 * Alleen in formules, alleen buiten strings, en alleen als het fragment na een operator/haakje/`=` begint.
 */
export function functionTokenAtCaret(text: string, caret: number): FunctionToken | null {
  if (!text.startsWith('=') || caret < 2) return null;
  if (insideString(text, caret)) return null;
  const before = text.slice(0, caret);
  const m = /([A-Za-z][A-Za-z0-9.]*)$/.exec(before);
  if (!m) return null;
  const start = caret - m[1].length;
  const prev = before.slice(0, start).trimEnd();
  const prevChar = prev[prev.length - 1];
  if (prevChar === undefined || !OPERATOR_CHARS.has(prevChar)) return null;
  // Een celverwijzing zoals 'B11' is geen functienaam-prefix zodra er cijfers in zitten.
  if (/^[A-Za-z]{1,3}\d+$/.test(m[1])) return null;
  return { start, prefix: m[1] };
}

/** Kan op deze positie een celverwijzing worden ingevoegd door te klikken? */
export function isRefInsertPosition(text: string, caret: number): boolean {
  if (!text.startsWith('=')) return false;
  if (insideString(text, caret)) return false;
  const before = text.slice(0, caret).trimEnd();
  const prevChar = before[before.length - 1];
  return prevChar !== undefined && OPERATOR_CHARS.has(prevChar);
}

export interface RefToken {
  start: number;
  end: number;
  ref: string;
}

const REF_RE = /\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?/g;

/** De celverwijzing waarin of direct na dewelke de caret staat. */
export function refTokenAtCaret(text: string, caret: number): RefToken | null {
  if (!text.startsWith('=')) return null;
  for (const m of text.matchAll(REF_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (caret >= start && caret <= end && !insideString(text, start)) {
      // niet matchen als het deel is van een functienaam (bv. 'LOG10')
      const prevChar = text[start - 1];
      if (prevChar && /[A-Za-z0-9.]/.test(prevChar)) continue;
      return { start, end, ref: m[0] };
    }
  }
  return null;
}
