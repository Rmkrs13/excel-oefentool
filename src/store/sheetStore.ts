import { create } from 'zustand';
import type { A1, Addr, CellData, DisplayValue, EditState, Exercise, NumberFormatSpec, Range, StepResult } from '../exercises/types';
import { SheetEngine, sheetDefsToCells } from '../engine/engine';
import { normalizeRange, parseA1, rangeCells, rangeSize, splitSheetRef, toA1 } from '../engine/address';
import { parseUserInput } from '../engine/parseInput';
import { adjustDecimals as adjustDecimalsSpec } from '../format/numberFormat';
import { computeSeries } from '../format/series';
import { findSheetKey, makeCheckContext, type SheetsCells, type SheetsValues } from '../checks/context';
import { runStep } from '../checks/runChecks';
import { debounce, loadProgress, saveProgress, clearProgress, saveSummary, clearSummary } from './persistence';
import { explainError } from '../engine/hf';
import { autoCloseParens } from '../checks/formulaUtils';

export interface Selection {
  anchor: Addr;
  focus: Addr;
}

export interface CellPatch {
  sheet?: string; // standaard: actief tabblad
  a1: A1;
  raw?: string;
  format?: NumberFormatSpec | null; // null = notatie wissen
}

type Snapshot = SheetsCells;

export interface SheetStore {
  exercise: Exercise | null;
  sheets: SheetsCells;
  values: SheetsValues;
  activeSheet: string;
  selections: Record<string, Selection>;
  selection: Selection;
  editing: EditState | null;
  fillDrag: { source: Range; target: Range | null } | null;
  stepResults: Record<string, StepResult>;
  history: { past: Snapshot[]; future: Snapshot[] };
  notice: string | null;

  loadExercise(ex: Exercise): void;
  unload(): void;
  setActiveSheet(name: string): void;
  select(anchor: Addr, focus?: Addr): void;
  extendSelection(focus: Addr): void;
  moveActive(dr: number, dc: number, extend?: boolean): void;
  startEdit(addr: Addr, initialText: string, mode: EditState['mode'], source: EditState['source']): void;
  updateEdit(patch: Partial<EditState>): void;
  commitEdit(move: 'down' | 'up' | 'right' | 'left' | 'none'): boolean;
  cancelEdit(): void;
  setCells(patches: CellPatch[], opts?: { undoable?: boolean }): void;
  clearSelection(): void;
  setFillDrag(drag: SheetStore['fillDrag']): void;
  fill(source: Range, target: Range): void;
  setFormatOnSelection(spec: NumberFormatSpec | null): void;
  adjustDecimalsOnSelection(delta: 1 | -1): void;
  undo(): void;
  redo(): void;
  resetExercise(): void;
  setNotice(msg: string | null): void;
}

let engine: SheetEngine | null = null;
export function getEngine(): SheetEngine {
  if (!engine) engine = new SheetEngine();
  return engine;
}

const persist = debounce((id: string, version: number, sheets: Snapshot) => {
  saveProgress(id, { version, sheets, updatedAt: Date.now() });
}, 400);

function selectionRange(sel: Selection): Range {
  return normalizeRange({ start: sel.anchor, end: sel.focus });
}

const ORIGIN: Selection = { anchor: { row: 0, col: 0 }, focus: { row: 0, col: 0 } };

function sheetDef(ex: Exercise | null, name: string) {
  return ex?.sheets.find((s) => s.name.toLowerCase() === name.toLowerCase());
}

function clampAddr(a: Addr, ex: Exercise | null, sheet: string): Addr {
  const def = sheetDef(ex, sheet);
  const rows = def?.rows ?? 50;
  const cols = def?.cols ?? 12;
  return { row: Math.min(Math.max(0, a.row), rows - 1), col: Math.min(Math.max(0, a.col), cols - 1) };
}

export const useSheetStore = create<SheetStore>((set, get) => {
  function runAllChecks(sheets: Snapshot, values: SheetsValues, ex: Exercise): Record<string, StepResult> {
    const defaultSheet = ex.sheets[0].name;
    const ctx = makeCheckContext(sheets, values, getEngine(), defaultSheet);
    const initialRaw = (ref: string) => {
      const { sheet, ref: a1 } = splitSheetRef(ref, defaultSheet);
      return sheetDef(ex, sheet)?.cells[a1]?.raw ?? '';
    };
    const out: Record<string, StepResult> = {};
    for (const step of ex.steps) out[step.id] = runStep(step, ctx, initialRaw);
    saveSummary(ex.id, { done: Object.values(out).filter((r) => r.ok).length, total: ex.steps.length });
    return out;
  }

  function loadIntoEngine(ex: Exercise, sheets: Snapshot): SheetsValues {
    return getEngine().load(ex.sheets.map((d) => ({ name: d.name, rows: d.rows, cols: d.cols, cells: sheets[d.name] ?? {} })));
  }

  function reloadFromSnapshot(sheets: Snapshot) {
    const ex = get().exercise;
    if (!ex) return;
    const values = loadIntoEngine(ex, sheets);
    set({ sheets, values, stepResults: runAllChecks(sheets, values, ex) });
    persist(ex.id, ex.version, sheets);
  }

  return {
    exercise: null,
    sheets: {},
    values: {},
    activeSheet: '',
    selections: {},
    selection: ORIGIN,
    editing: null,
    fillDrag: null,
    stepResults: {},
    history: { past: [], future: [] },
    notice: null,

    loadExercise(ex) {
      if (engine) engine.destroy();
      engine = new SheetEngine();
      const saved = loadProgress(ex.id, ex.version);
      const sheets: Snapshot = {};
      for (const d of sheetDefsToCells(ex.sheets)) sheets[d.name] = saved?.sheets[d.name] ? saved.sheets[d.name] : structuredClone(d.cells);
      const values = loadIntoEngine(ex, sheets);
      set({
        exercise: ex,
        sheets,
        values,
        activeSheet: ex.sheets[0].name,
        selections: {},
        selection: ORIGIN,
        editing: null,
        fillDrag: null,
        history: { past: [], future: [] },
        notice: null,
        stepResults: runAllChecks(sheets, values, ex),
      });
    },

    unload() {
      if (engine) engine.destroy();
      engine = null;
      set({ exercise: null, sheets: {}, values: {}, activeSheet: '', editing: null, stepResults: {}, history: { past: [], future: [] } });
    },

    setActiveSheet(name) {
      const { activeSheet, selection, selections, editing } = get();
      if (name === activeSheet) return;
      const nextSelections = { ...selections, [activeSheet]: selection };
      const patch: Partial<SheetStore> = { activeSheet: name, selections: nextSelections, selection: nextSelections[name] ?? ORIGIN, fillDrag: null };
      // Tijdens formule-invoer: het bewerkte tabblad blijft hetzelfde; de formulebalk neemt de invoer over.
      if (editing) {
        if (editing.text.startsWith('=')) patch.editing = { ...editing, source: 'formulaBar', autocomplete: undefined };
        else {
          get().commitEdit('none');
        }
      }
      set(patch);
    },

    select(anchor, focus) {
      const { exercise, activeSheet } = get();
      const a = clampAddr(anchor, exercise, activeSheet);
      set({ selection: { anchor: a, focus: focus ? clampAddr(focus, exercise, activeSheet) : a } });
    },

    extendSelection(focus) {
      set((s) => ({ selection: { anchor: s.selection.anchor, focus: clampAddr(focus, s.exercise, s.activeSheet) } }));
    },

    moveActive(dr, dc, extend = false) {
      const { selection, exercise, activeSheet } = get();
      if (extend) {
        const f = clampAddr({ row: selection.focus.row + dr, col: selection.focus.col + dc }, exercise, activeSheet);
        set({ selection: { anchor: selection.anchor, focus: f } });
      } else {
        const a = clampAddr({ row: selection.anchor.row + dr, col: selection.anchor.col + dc }, exercise, activeSheet);
        set({ selection: { anchor: a, focus: a } });
      }
    },

    startEdit(addr, initialText, mode, source) {
      const { activeSheet, sheets } = get();
      const cell = sheets[activeSheet]?.[toA1(addr)];
      if (cell?.locked) {
        set({ notice: 'Deze cel is voorgegeven en kan niet gewijzigd worden.' });
        return;
      }
      set({
        editing: { sheet: activeSheet, addr, text: initialText, caret: initialText.length, mode, source },
        selection: { anchor: addr, focus: addr },
      });
    },

    updateEdit(patch) {
      set((s) => (s.editing ? { editing: { ...s.editing, ...patch } } : {}));
    },

    commitEdit(move) {
      const { editing } = get();
      if (!editing) return true;
      const text = autoCloseParens(editing.text);
      if (text.startsWith('=') && text.length > 1 && !getEngine().validateFormula(text)) {
        set({ editing: { ...editing, error: 'Er is een probleem met deze formule. Controleer haakjes en puntkomma’s.' } });
        return false;
      }
      const a1 = toA1(editing.addr);
      const current = get().sheets[editing.sheet]?.[a1];
      const parsed = parseUserInput(text, current?.format);
      const patch: CellPatch = { sheet: editing.sheet, a1, raw: text };
      if (parsed.kind === 'number' && parsed.inferredFormat && (!current?.format || current.format.kind === 'general')) {
        patch.format = parsed.inferredFormat;
      }
      set({ editing: null });
      if (get().activeSheet !== editing.sheet) {
        // terug naar het tabblad van de bewerkte cel
        const s = get();
        set({ activeSheet: editing.sheet, selections: { ...s.selections, [s.activeSheet]: s.selection } });
      }
      if ((current?.raw ?? '') !== text || patch.format) get().setCells([patch]);
      get().select(editing.addr);
      const d = { down: [1, 0], up: [-1, 0], right: [0, 1], left: [0, -1], none: [0, 0] }[move];
      if (d[0] || d[1]) get().moveActive(d[0], d[1]);
      return true;
    },

    cancelEdit() {
      const { editing, activeSheet, selections, selection } = get();
      if (!editing) return;
      const patch: Partial<SheetStore> = { editing: null, selection: { anchor: editing.addr, focus: editing.addr } };
      if (activeSheet !== editing.sheet) {
        patch.activeSheet = editing.sheet;
        patch.selections = { ...selections, [activeSheet]: selection };
      }
      set(patch);
    },

    setCells(patches, opts) {
      const { sheets, exercise, history, activeSheet } = get();
      if (!exercise) return;
      const undoable = opts?.undoable ?? true;
      const next: Snapshot = { ...sheets };
      const enginePatches: Array<{ sheet: string; addr: Addr; cell: CellData | undefined }> = [];
      for (const p of patches) {
        const sheetName = findSheetKey(next, p.sheet ?? activeSheet);
        if (!sheetName) continue;
        const sheetCells = { ...next[sheetName] };
        const prev = sheetCells[p.a1];
        if (prev?.locked) continue;
        const cell: CellData = { ...(prev ?? { raw: '' }) };
        if (p.raw !== undefined) cell.raw = p.raw;
        if (p.format === null) delete cell.format;
        else if (p.format) cell.format = p.format;
        if (cell.raw === '' && !cell.format && !cell.style) delete sheetCells[p.a1];
        else sheetCells[p.a1] = cell;
        next[sheetName] = sheetCells;
        enginePatches.push({ sheet: sheetName, addr: parseA1(p.a1), cell: sheetCells[p.a1] });
      }
      if (enginePatches.length === 0) return;
      const changes = getEngine().setCells(enginePatches);
      const values: SheetsValues = { ...get().values };
      for (const c of changes) values[c.sheet] = { ...(values[c.sheet] ?? {}), [c.a1]: c.value };
      const stepResults = runAllChecks(next, values, exercise);
      set({
        sheets: next,
        values,
        stepResults,
        history: undoable ? { past: [...history.past.slice(-99), sheets], future: [] } : history,
      });
      persist(exercise.id, exercise.version, next);
    },

    clearSelection() {
      const { selection, sheets, activeSheet } = get();
      const r = selectionRange(selection);
      const cells = sheets[activeSheet] ?? {};
      const patches = rangeCells(r)
        .map(toA1)
        .filter((a1) => cells[a1] && cells[a1].raw !== '')
        .map((a1) => ({ a1, raw: '' }));
      if (patches.length) get().setCells(patches);
    },

    setFillDrag(drag) {
      set({ fillDrag: drag });
    },

    fill(source, target) {
      const src = normalizeRange(source);
      const tgt = normalizeRange(target);
      const { sheets, values, activeSheet } = get();
      const cells = sheets[activeSheet] ?? {};
      const vals = values[activeSheet] ?? {};
      const engineData = getEngine().fillRangeData(activeSheet, src, tgt);
      const patches: CellPatch[] = [];
      const sSize = rangeSize(src);
      const tSize = rangeSize(tgt);

      const down = tgt.end.row > src.end.row;
      const up = tgt.start.row < src.start.row;
      const right = tgt.end.col > src.end.col;
      const left = tgt.start.col < src.start.col;

      if (down || up) {
        const direction: 1 | -1 = down ? 1 : -1;
        const count = tSize.rows - sSize.rows;
        for (let c = src.start.col; c <= src.end.col; c++) {
          const column = Array.from({ length: sSize.rows }, (_, i) => {
            const a1 = toA1({ row: src.start.row + i, col: c });
            return { cell: cells[a1], value: vals[a1]?.value ?? null };
          });
          const series = computeSeries(column, count, direction);
          for (let i = 0; i < count; i++) {
            const row = down ? src.end.row + 1 + i : src.start.row - 1 - i;
            const a1 = toA1({ row, col: c });
            const s = series[i];
            const shifted = engineData[row - tgt.start.row]?.[c - tgt.start.col];
            const raw = s.raw.startsWith('=') && typeof shifted === 'string' ? shifted : s.raw;
            patches.push({ a1, raw, format: s.format ?? null });
          }
        }
      } else if (right || left) {
        const direction: 1 | -1 = right ? 1 : -1;
        const count = tSize.cols - sSize.cols;
        for (let r = src.start.row; r <= src.end.row; r++) {
          const rowCells = Array.from({ length: sSize.cols }, (_, i) => {
            const a1 = toA1({ row: r, col: src.start.col + i });
            return { cell: cells[a1], value: vals[a1]?.value ?? null };
          });
          const series = computeSeries(rowCells, count, direction);
          for (let i = 0; i < count; i++) {
            const col = right ? src.end.col + 1 + i : src.start.col - 1 - i;
            const a1 = toA1({ row: r, col });
            const s = series[i];
            const shifted = engineData[r - tgt.start.row]?.[col - tgt.start.col];
            const raw = s.raw.startsWith('=') && typeof shifted === 'string' ? shifted : s.raw;
            patches.push({ a1, raw, format: s.format ?? null });
          }
        }
      }
      if (patches.length) get().setCells(patches);
      set({ selection: { anchor: tgt.start, focus: tgt.end }, fillDrag: null });
    },

    setFormatOnSelection(spec) {
      const r = selectionRange(get().selection);
      get().setCells(rangeCells(r).map((a) => ({ a1: toA1(a), format: spec })));
    },

    adjustDecimalsOnSelection(delta) {
      const { selection, sheets, values, activeSheet } = get();
      const cells = sheets[activeSheet] ?? {};
      const r = selectionRange(selection);
      const anchorA1 = toA1(selection.anchor);
      const anchorValue = values[activeSheet]?.[anchorA1]?.value;
      const base = adjustDecimalsSpec(cells[anchorA1]?.format, delta, typeof anchorValue === 'number' ? anchorValue : undefined);
      get().setCells(
        rangeCells(r).map((a) => {
          const a1 = toA1(a);
          const own = cells[a1]?.format;
          const spec = own && own.kind !== 'general' ? adjustDecimalsSpec(own, delta) : base;
          return { a1, format: spec };
        }),
      );
    },

    undo() {
      const { history, sheets } = get();
      const prev = history.past[history.past.length - 1];
      if (!prev) return;
      set({ history: { past: history.past.slice(0, -1), future: [sheets, ...history.future] }, editing: null });
      reloadFromSnapshot(prev);
    },

    redo() {
      const { history, sheets } = get();
      const next = history.future[0];
      if (!next) return;
      set({ history: { past: [...history.past, sheets], future: history.future.slice(1) }, editing: null });
      reloadFromSnapshot(next);
    },

    resetExercise() {
      const ex = get().exercise;
      if (!ex) return;
      clearProgress(ex.id);
      clearSummary(ex.id);
      get().loadExercise(ex);
    },

    setNotice(msg) {
      set({ notice: msg });
    },
  };
});

/** Uitleg bij de foutwaarde van de actieve cel, voor onder de formulebalk. */
export function activeCellErrorHint(values: Record<A1, DisplayValue> | undefined, selection: Selection): string | null {
  const dv = values?.[toA1(selection.anchor)];
  if (!dv?.error) return null;
  return `${dv.error.text}: ${explainError(dv.error.type)}`;
}

/** Selector-helpers voor componenten. */
export const selectActiveCells = (s: SheetStore) => s.sheets[s.activeSheet] ?? EMPTY_CELLS;
export const selectActiveValues = (s: SheetStore) => s.values[s.activeSheet] ?? EMPTY_VALUES;
const EMPTY_CELLS: Record<A1, CellData> = {};
const EMPTY_VALUES: Record<A1, DisplayValue> = {};

export { selectionRange };
