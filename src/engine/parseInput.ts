import type { NumberFormatSpec } from '../exercises/types';
import { parseDateText } from '../format/dates';

export type ParsedInput =
  | { kind: 'empty' }
  | { kind: 'formula'; text: string }
  | { kind: 'number'; value: number; inferredFormat?: NumberFormatSpec }
  | { kind: 'text'; value: string };

const PLAIN_NUMBER_RE = /^-?\d+(,\d+)?$/;
const GROUPED_NUMBER_RE = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/;
const DOT_DECIMAL_RE = /^-?\d+\.\d+$/;

/** Nederlandse getalnotatie ('1.234,5') naar number, of null. */
export function parseDutchNumber(text: string): number | null {
  const t = text.trim();
  if (PLAIN_NUMBER_RE.test(t)) return Number(t.replace(',', '.'));
  if (GROUPED_NUMBER_RE.test(t)) return Number(t.replace(/\./g, '').replace(',', '.'));
  return null;
}

/**
 * Interpreteert wat de student intypte, zoals een Nederlandstalige Excel dat doet.
 * `format` is de huidige celnotatie: bij notatie Tekst wordt alles tekst.
 */
export function parseUserInput(text: string, format?: NumberFormatSpec): ParsedInput {
  if (text === '') return { kind: 'empty' };
  if (text.startsWith('=') && text.length > 1) return { kind: 'formula', text };
  if (text.startsWith("'")) return { kind: 'text', value: text.slice(1) };
  if (format?.kind === 'text') return { kind: 'text', value: text };

  const t = text.trim();
  const n = parseDutchNumber(t);
  if (n !== null) return { kind: 'number', value: n };

  // '12,5%' -> 0.125 met percentnotatie
  if (t.endsWith('%')) {
    const p = parseDutchNumber(t.slice(0, -1).trim());
    if (p !== null) {
      const dec = (t.slice(0, -1).split(',')[1] ?? '').length;
      return { kind: 'number', value: p / 100, inferredFormat: { kind: 'percent', decimals: dec } };
    }
  }
  // '€ 12,5' of '12,5 €'
  const euro = t.replace(/^€\s*/, '').replace(/\s*€$/, '');
  if (euro !== t) {
    const e = parseDutchNumber(euro);
    if (e !== null) return { kind: 'number', value: e, inferredFormat: { kind: 'currency', decimals: 2, grouping: true, currency: '€' } };
  }
  // datum dd/mm/jjjj
  const serial = parseDateText(t);
  if (serial !== null) return { kind: 'number', value: serial, inferredFormat: { kind: 'date', dateCode: 'dd/mm/jjjj' } };

  // '3.5' met punt: in NL-Excel is dat tekst (of een datum). Wij houden het tekst.
  if (DOT_DECIMAL_RE.test(t)) return { kind: 'text', value: text };

  return { kind: 'text', value: text };
}
