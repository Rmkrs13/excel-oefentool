import type { Check, CheckContext, CheckResult, Step, StepResult } from '../exercises/types';
import { rangeCells, parseRange, splitSheetRef, toA1 } from '../engine/address';
import { formatCode } from '../format/numberFormat';
import { canonicalFormula, functionsUsed, hasNested, hasRef } from './formulaUtils';

const REL_TOL = 1e-6;

function numbersEqual(a: number, b: number, tolerance = REL_TOL): boolean {
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= tolerance * scale;
}

function valueMatches(actual: unknown, expected: string | number, tolerance?: number): boolean {
  if (typeof expected === 'number') return typeof actual === 'number' && numbersEqual(actual, expected, tolerance);
  return typeof actual === 'string' && actual.trim().toLowerCase() === expected.trim().toLowerCase();
}

/** Alle cellen van een (eventueel tabblad-gekwalificeerd) bereik, met hetzelfde tabbladvoorvoegsel. */
function cellsOf(range: string): string[] {
  const i = range.lastIndexOf('!');
  const prefix = i >= 0 ? range.slice(0, i + 1) : '';
  const { ref } = splitSheetRef(range, '');
  return rangeCells(parseRange(ref)).map((a) => prefix + toA1(a));
}

function errorResult(ctx: CheckContext, cell: string): CheckResult | null {
  if (!ctx.isError(cell)) return null;
  return { ok: false, message: `${cell} geeft de fout ${ctx.errorText(cell)}.` };
}

export function runCheck(check: Check, ctx: CheckContext): CheckResult {
  switch (check.type) {
    case 'formula': {
      const err = errorResult(ctx, check.cell);
      if (err) return err;
      const actual = ctx.formula(check.cell);
      const expects = (Array.isArray(check.expect) ? check.expect : [check.expect]).map(canonicalFormula);
      if (!actual) {
        return { ok: false, message: ctx.raw(check.cell) === '' ? `${check.cell} is nog leeg.` : `${check.cell} bevat geen formule. Begin met =.` };
      }
      if (expects.includes(actual)) return { ok: true, message: `${check.cell} is juist.` };
      if (check.mode === 'equivalent') {
        const wantedFns = new Set(functionsUsed(expects[0]));
        const usedFns = new Set(functionsUsed(actual));
        const fnOk = [...wantedFns].every((f) => usedFns.has(f));
        // waarde vergelijken met de verwachte formule is niet mogelijk zonder evaluatie; vertrouw op functieset + geen fout
        if (fnOk) return { ok: true, message: `${check.cell} is juist.` };
        return { ok: false, partial: true, message: `${check.cell}: gebruik de functie ${[...wantedFns].join(', ')}.` };
      }
      const wantedFns = functionsUsed(expects[0]);
      const missing = wantedFns.filter((f) => !functionsUsed(actual).includes(f));
      if (missing.length) return { ok: false, partial: true, message: `${check.cell}: gebruik de functie ${missing.join(', ')} (verwacht ${expects[0]}).` };
      return { ok: false, message: `${check.cell}: verwacht ${expects[0]}, je typte ${actual}.` };
    }
    case 'value': {
      const err = errorResult(ctx, check.cell);
      if (err) return err;
      const actual = ctx.value(check.cell);
      if (actual === null || actual === '') return { ok: false, message: `${check.cell} is nog leeg.` };
      if (valueMatches(actual, check.expect, check.tolerance)) return { ok: true, message: `${check.cell} klopt.` };
      return { ok: false, message: `${check.cell}: verwacht ${check.expect}, je hebt ${String(actual)}.` };
    }
    case 'usesFunction': {
      const f = ctx.formula(check.cell);
      if (!f) return { ok: false, message: `${check.cell} bevat nog geen formule.` };
      if (check.nestedIn) {
        if (hasNested(f, check.nestedIn, check.fn)) return { ok: true, message: `${check.cell}: ${check.fn} zit genest in ${check.nestedIn}.` };
        return { ok: false, partial: functionsUsed(f).includes(check.fn), message: `${check.cell}: zet een ${check.fn} binnen de haakjes van ${check.nestedIn}.` };
      }
      if (functionsUsed(f).includes(check.fn)) return { ok: true, message: `${check.cell} gebruikt ${check.fn}.` };
      return { ok: false, partial: true, message: `${check.cell}: gebruik de functie ${check.fn}.` };
    }
    case 'usesAbsoluteRef': {
      const f = ctx.formula(check.cell);
      if (!f) return { ok: false, message: `${check.cell} bevat nog geen formule.` };
      if (hasRef(f, check.ref)) return { ok: true, message: `${check.cell} gebruikt ${check.ref}.` };
      return { ok: false, partial: true, message: `${check.cell}: zet de verwijzing vast met $ (${check.ref}). Tip: F4.` };
    }
    case 'format': {
      const expects = Array.isArray(check.expect) ? check.expect : [check.expect];
      const wrong = cellsOf(check.range).filter((a1) => !expects.includes(formatCode(ctx.format(a1))));
      if (wrong.length === 0) return { ok: true, message: `Notatie van ${check.range} is juist.` };
      return { ok: false, message: `Geef ${wrong.length === 1 ? wrong[0] : `${check.range} (o.a. ${wrong[0]})`} de notatie ${expects[0]}.` };
    }
    case 'isText': {
      const v = ctx.value(check.cell);
      if (v === null || v === '') return { ok: false, message: `${check.cell} is nog leeg.` };
      if (!ctx.isText(check.cell)) return { ok: false, message: `${check.cell} is een getal; het moet tekst zijn.` };
      if (check.expect !== undefined && String(v).trim() !== check.expect) return { ok: false, message: `${check.cell}: verwacht "${check.expect}".` };
      return { ok: true, message: `${check.cell} is tekst.` };
    }
    case 'rangeFilled': {
      const cells = cellsOf(check.range);
      for (let i = 0; i < cells.length; i++) {
        const a1 = cells[i];
        const err = errorResult(ctx, a1);
        if (err) return err;
        const v = ctx.value(a1);
        if (v === null || v === '') return { ok: false, message: `${a1} is nog leeg.` };
        if (!valueMatches(v, check.values[i])) return { ok: false, message: `${a1}: verwacht ${check.values[i]}, je hebt ${String(v)}.` };
      }
      return { ok: true, message: `${check.range} is juist ingevuld.` };
    }
    case 'fillPattern': {
      const cells = cellsOf(check.range);
      const wanted = canonicalFormula(check.formula);
      for (const a1 of cells) {
        const err = errorResult(ctx, a1);
        if (err) return err;
        const f = ctx.formula(a1);
        if (!f) return { ok: false, message: ctx.raw(a1) === '' ? `${a1} is nog leeg.` : `${a1} bevat geen formule.` };
        const expected = canonicalFormula(ctx.expectedFill(check.anchor, wanted, a1));
        if (f !== expected) {
          const isAnchor = a1 === check.anchor;
          const missing = functionsUsed(wanted).filter((fn) => !functionsUsed(f).includes(fn));
          return {
            ok: false,
            partial: isAnchor && missing.length > 0,
            message: isAnchor
              ? `${a1}: verwacht ${expected}, je typte ${f}.`
              : `${a1}: verwacht ${expected}, je hebt ${f}. Schrijf één formule in ${check.anchor} en trek ze door.`,
          };
        }
      }
      return { ok: true, message: `${check.range} volgt het patroon.` };
    }
    case 'predicate': {
      const ok = check.test(ctx);
      return { ok, message: ok ? check.label : (check.message ?? check.label) };
    }
  }
}

/** Alle cellen die een check bekijkt (om te bepalen of de student de stap al aanraakte). */
export function cellsInvolved(check: Check): string[] {
  switch (check.type) {
    case 'format':
    case 'rangeFilled':
    case 'fillPattern':
      return cellsOf(check.range);
    case 'predicate':
      return [];
    default:
      return [check.cell];
  }
}

export function runStep(step: Step, ctx: CheckContext, initialRaw: (a1: string) => string): StepResult {
  const results = step.checks.map((c) => runCheck(c, ctx));
  const ok = results.every((r) => r.ok);
  const partial = !ok && results.some((r) => r.ok || r.partial);
  const touched = step.checks.some((c) =>
    cellsInvolved(c).some((a1) => (c.type === 'format' ? formatCode(ctx.format(a1)) !== 'Standaard' : ctx.raw(a1) !== initialRaw(a1))),
  );
  return { ok, partial, touched, results };
}
