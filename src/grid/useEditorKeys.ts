import { useCallback, useLayoutEffect, type KeyboardEvent, type RefObject } from 'react';
import { useSheetStore } from '../store/sheetStore';
import type { EditState } from '../exercises/types';
import { functionTokenAtCaret, isRefInsertPosition, refTokenAtCaret } from './editing/tokens';
import { matchFunctions, TAUGHT_FUNCTIONS } from './editing/autocomplete';
import { cycleAbsolute } from './editing/f4';
import { allFunctionNames } from '../engine/hf';
import { rangeToA1 } from '../engine/address';

/** Berekent de autocomplete-toestand voor een tekst/caret. */
export function computeAutocomplete(text: string, caret: number, allowed?: string[]): EditState['autocomplete'] {
  const token = functionTokenAtCaret(text, caret);
  if (!token) return undefined;
  const items = matchFunctions(token.prefix, allFunctionNames(), TAUGHT_FUNCTIONS, allowed);
  if (items.length === 0) return undefined;
  return { items, index: 0, tokenStart: token.start };
}

/** Gedeelde toetsen- en invoerlogica voor de celeditor en de formulebalk. */
export function useEditorKeys(inputRef: RefObject<HTMLInputElement | null>, source: EditState['source']) {
  const editing = useSheetStore((s) => s.editing);
  const allowed = useSheetStore((s) => s.exercise?.allowedFunctions);

  // Caret synchroon houden na programmatische wijzigingen (autocomplete, verwijzing, F4).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || !editing || editing.source !== source) return;
    if (document.activeElement !== el) el.focus();
    if (el.selectionStart !== editing.caret || el.selectionEnd !== editing.caret) {
      el.setSelectionRange(editing.caret, editing.caret);
    }
  }, [editing?.text, editing?.caret, editing?.source, editing, inputRef, source]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const s = useSheetStore.getState();
      const text = e.target.value;
      const caret = e.target.selectionStart ?? text.length;
      if (!s.editing) {
        // typen in de formulebalk zonder actieve edit: start editing van de actieve cel
        s.startEdit(s.selection.anchor, text, 'edit', source);
        s.updateEdit({ caret, autocomplete: computeAutocomplete(text, caret, allowed) });
        return;
      }
      s.updateEdit({ text, caret, source, pointRef: undefined, pointCursor: undefined, pointAnchor: undefined, error: undefined, autocomplete: computeAutocomplete(text, caret, allowed) });
    },
    [allowed, source],
  );

  const onSelect = useCallback(() => {
    const el = inputRef.current;
    const s = useSheetStore.getState();
    if (!el || !s.editing || s.editing.source !== source) return;
    const caret = el.selectionStart ?? 0;
    if (caret !== s.editing.caret) s.updateEdit({ caret, autocomplete: computeAutocomplete(s.editing.text, caret, allowed) });
  }, [allowed, inputRef, source]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      const s = useSheetStore.getState();
      const ed = s.editing;
      if (!ed) {
        if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
          e.preventDefault();
          s.select(s.selection.anchor);
          (document.querySelector('.grid-scroll') as HTMLElement | null)?.focus();
        }
        return;
      }
      const ac = ed.autocomplete;

      if (ac) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          s.updateEdit({ autocomplete: { ...ac, index: (ac.index + 1) % ac.items.length } });
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          s.updateEdit({ autocomplete: { ...ac, index: (ac.index - 1 + ac.items.length) % ac.items.length } });
          return;
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          acceptSuggestion(ac.items[ac.index]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          s.updateEdit({ autocomplete: undefined });
          return;
        }
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (s.commitEdit(e.shiftKey ? 'up' : 'down')) focusGrid();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (s.commitEdit(e.shiftKey ? 'left' : 'right')) focusGrid();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        s.cancelEdit();
        focusGrid();
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        const tok = refTokenAtCaret(ed.text, ed.caret);
        if (tok) {
          const next = cycleAbsolute(tok.ref);
          const text = ed.text.slice(0, tok.start) + next + ed.text.slice(tok.end);
          s.updateEdit({ text, caret: tok.start + next.length, pointRef: undefined });
        }
        return;
      }
      if (e.key.startsWith('Arrow')) {
        const dr = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        const dc = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        // Point-modus met het toetsenbord: een verwijzing aanwijzen.
        if (ed.text.startsWith('=') && (ed.pointCursor || isRefInsertPosition(ed.text, ed.caret))) {
          e.preventDefault();
          const ex = s.exercise;
          const from = ed.pointCursor ?? ed.addr;
          const cursor = {
            row: Math.min(Math.max(0, from.row + dr), (ex?.sheet.rows ?? 50) - 1),
            col: Math.min(Math.max(0, from.col + dc), (ex?.sheet.cols ?? 12) - 1),
          };
          // Shift+pijltje: bereik uitbreiden vanaf het anker (zoals in Excel).
          const anchor = e.shiftKey && ed.pointCursor ? (ed.pointAnchor ?? ed.pointCursor) : cursor;
          insertRangeRef(anchor, cursor);
          return;
        }
        if (ed.mode === 'enter') {
          e.preventDefault();
          const move = dr === 1 ? 'down' : dr === -1 ? 'up' : dc === 1 ? 'right' : 'left';
          if (s.commitEdit(move)) focusGrid();
          return;
        }
      }
    },
    [],
  );

  return { onChange, onKeyDown, onSelect, editing };
}

export function focusGrid(): void {
  (document.querySelector('.grid-scroll') as HTMLElement | null)?.focus({ preventScroll: true });
}

/** Vervangt het getypte functiefragment door NAAM( . */
export function acceptSuggestion(name: string): void {
  const s = useSheetStore.getState();
  const ed = s.editing;
  if (!ed?.autocomplete) return;
  const { tokenStart } = ed.autocomplete;
  const insert = `${name}(`;
  const text = ed.text.slice(0, tokenStart) + insert + ed.text.slice(ed.caret);
  s.updateEdit({ text, caret: tokenStart + insert.length, autocomplete: undefined });
}

/** Voegt een verwijzing in op de caret of vervangt de vorige point-verwijzing. */
export function insertRef(ref: string, cursor?: { row: number; col: number }, anchor?: { row: number; col: number }): void {
  const s = useSheetStore.getState();
  const ed = s.editing;
  if (!ed) return;
  const start = ed.pointRef ? ed.pointRef.start : ed.caret;
  const end = ed.pointRef ? ed.pointRef.end : ed.caret;
  const text = ed.text.slice(0, start) + ref + ed.text.slice(end);
  s.updateEdit({ text, caret: start + ref.length, pointRef: { start, end: start + ref.length }, pointCursor: cursor, pointAnchor: anchor ?? cursor, autocomplete: undefined });
}

export function insertRangeRef(anchor: { row: number; col: number }, focus: { row: number; col: number }): void {
  insertRef(rangeToA1({ start: anchor, end: focus }), focus, anchor);
}
