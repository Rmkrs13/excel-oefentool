import { useCallback, useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { useSheetStore, selectionRange, selectActiveCells } from '../store/sheetStore';
import type { Addr } from '../exercises/types';
import { normalizeRange, rangeContains, toA1 } from '../engine/address';
import { isRefInsertPosition } from './editing/tokens';
import { insertRangeRef, focusGrid } from './useEditorKeys';

function addrFromEvent(e: MouseEvent | globalThis.MouseEvent): Addr | null {
  const el = (e.target as HTMLElement).closest('[data-r]') as HTMLElement | null;
  if (!el) return null;
  return { row: Number(el.dataset.r), col: Number(el.dataset.c) };
}

type DragMode = 'select' | 'point' | 'fill' | null;

/** Muis- en toetsenbordgedrag van het grid. */
export function useGridInteraction() {
  const drag = useRef<{ mode: DragMode; anchor: Addr | null }>({ mode: null, anchor: null });

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      const d = drag.current;
      if (!d.mode) return;
      const a = addrFromEvent(e);
      if (!a) return;
      const s = useSheetStore.getState();
      if (d.mode === 'select') s.extendSelection(a);
      else if (d.mode === 'point' && d.anchor) insertRangeRef(d.anchor, a);
      else if (d.mode === 'fill' && s.fillDrag) {
        const src = s.fillDrag.source;
        // Alleen in één richting uitbreiden: de grootste afstand wint.
        const dRow = a.row > src.end.row ? a.row - src.end.row : a.row < src.start.row ? a.row - src.start.row : 0;
        const dCol = a.col > src.end.col ? a.col - src.end.col : a.col < src.start.col ? a.col - src.start.col : 0;
        let target = null;
        if (Math.abs(dRow) >= Math.abs(dCol) && dRow !== 0) {
          target = normalizeRange({ start: { row: dRow > 0 ? src.start.row : a.row, col: src.start.col }, end: { row: dRow > 0 ? a.row : src.end.row, col: src.end.col } });
        } else if (dCol !== 0) {
          target = normalizeRange({ start: { row: src.start.row, col: dCol > 0 ? src.start.col : a.col }, end: { row: src.end.row, col: dCol > 0 ? a.col : src.end.col } });
        }
        s.setFillDrag({ source: src, target });
      }
    };
    const onUp = () => {
      const d = drag.current;
      if (d.mode === 'fill') {
        const s = useSheetStore.getState();
        if (s.fillDrag?.target) s.fill(s.fillDrag.source, s.fillDrag.target);
        else s.setFillDrag(null);
      }
      drag.current = { mode: null, anchor: null };
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const onMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return;
    const a = addrFromEvent(e);
    if (!a) return;
    const s = useSheetStore.getState();
    const ed = s.editing;
    if (ed) {
      const pointable = ed.text.startsWith('=') && (ed.pointRef || isRefInsertPosition(ed.text, ed.caret));
      if (pointable) {
        e.preventDefault(); // focus blijft in de editor
        // Shift+klik: bereik uitbreiden vanaf het anker van de vorige verwijzing.
        const anchor = e.shiftKey && ed.pointAnchor ? ed.pointAnchor : a;
        drag.current = { mode: 'point', anchor };
        insertRangeRef(anchor, a);
        return;
      }
      if (!s.commitEdit('none')) {
        e.preventDefault();
        return;
      }
    }
    if (e.shiftKey) s.extendSelection(a);
    else s.select(a);
    drag.current = { mode: 'select', anchor: a };
    focusGrid();
    e.preventDefault();
  }, []);

  const onDoubleClick = useCallback((e: MouseEvent) => {
    const a = addrFromEvent(e);
    if (!a) return;
    const s = useSheetStore.getState();
    if (s.editing) return;
    s.startEdit(a, selectActiveCells(s)[toA1(a)]?.raw ?? '', 'edit', 'cell');
  }, []);

  const onFillHandleMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const s = useSheetStore.getState();
    const src = selectionRange(s.selection);
    s.setFillDrag({ source: src, target: null });
    drag.current = { mode: 'fill', anchor: src.start };
  }, []);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    const s = useSheetStore.getState();
    if (s.editing) return; // de editor-input handelt zijn eigen toetsen af
    if (e.target !== e.currentTarget) return; // toetsen uit inputs (editor, formulebalk) niet dubbel verwerken
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) s.redo();
      else s.undo();
      return;
    }
    if (ctrl && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      s.redo();
      return;
    }
    if (ctrl) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        s.moveActive(1, 0, e.shiftKey);
        return;
      case 'ArrowUp':
        e.preventDefault();
        s.moveActive(-1, 0, e.shiftKey);
        return;
      case 'ArrowRight':
        e.preventDefault();
        s.moveActive(0, 1, e.shiftKey);
        return;
      case 'ArrowLeft':
        e.preventDefault();
        s.moveActive(0, -1, e.shiftKey);
        return;
      case 'Tab':
        e.preventDefault();
        s.moveActive(0, e.shiftKey ? -1 : 1);
        return;
      case 'Enter':
        e.preventDefault();
        s.moveActive(e.shiftKey ? -1 : 1, 0);
        return;
      case 'Home':
        e.preventDefault();
        s.select({ row: s.selection.anchor.row, col: 0 });
        return;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        s.clearSelection();
        return;
      case 'F2': {
        e.preventDefault();
        const a = s.selection.anchor;
        s.startEdit(a, selectActiveCells(s)[toA1(a)]?.raw ?? '', 'edit', 'cell');
        return;
      }
      case 'Escape':
        s.setNotice(null);
        return;
    }
    if (e.key.length === 1 && !e.altKey) {
      e.preventDefault();
      s.startEdit(s.selection.anchor, e.key, 'enter', 'cell');
      const st = useSheetStore.getState();
      if (st.editing && e.key === '=') st.updateEdit({ autocomplete: undefined });
    }
  }, []);

  const isInSelection = useCallback((a: Addr) => rangeContains(selectionRange(useSheetStore.getState().selection), a), []);

  return { onMouseDown, onDoubleClick, onFillHandleMouseDown, onKeyDown, isInSelection };
}
