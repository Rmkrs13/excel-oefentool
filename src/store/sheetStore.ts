import { create } from 'zustand';
import type { A1, Addr, CellData, DisplayValue, EditState, Exercise, NumberFormatSpec, Range, StepResult } from '../exercises/types';
import { SheetEngine } from '../engine/engine';
import { normalizeRange, parseA1, rangeCells, rangeSize, toA1 } from '../engine/address';
import { parseUserInput } from '../engine/parseInput';
import { adjustDecimals as adjustDecimalsSpec } from '../format/numberFormat';
import { computeSeries } from '../format/series';
import { makeCheckContext } from '../checks/context';
import { runStep } from '../checks/runChecks';
import { debounce, loadProgress, saveProgress, clearProgress, saveSummary, clearSummary } from './persistence';
import { explainError } from '../engine/hf';

export interface Selection {
  anchor: Addr;
  focus: Addr;
}

export interface CellPatch {
  a1: A1;
  raw?: string;
  format?: NumberFormatSpec | null; // null = notatie wissen
}

type Snapshot = Record<A1, CellData>;

export interface SheetStore {
  exercise: Exercise | null;
  cells: Record<A1, CellData>;
  values: Record<A1, DisplayValue>;
  selection: Selection;
  editing: EditState | null;
  fillDrag: { source: Range; target: Range | null } | null;
  stepResults: Record<string, StepResult>;
  history: { past: Snapshot[]; future: Snapshot[] };
  notice: string | null;

  loadExercise(ex: Exercise): void;
  unload(): void;
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

const persist = debounce((id: string, version: number, cells: Snapshot) => {
  saveProgress(id, { version, cells, updatedAt: Date.now() });
}, 400);

function selectionRange(sel: Selection): Range {
  return normalizeRange({ start: sel.anchor, end: sel.focus });
}

function clampAddr(a: Addr, ex: Exercise | null): Addr {
  const rows = ex?.sheet.rows ?? 50;
  const cols = ex?.sheet.cols ?? 12;
  return { row: Math.min(Math.max(0, a.row), rows - 1), col: Math.min(Math.max(0, a.col), cols - 1) };
}

export const useSheetStore = create<SheetStore>((set, get) => {
  function runAllChecks(cells: Snapshot, values: Record<A1, DisplayValue>, ex: Exercise): Record<string, StepResult> {
    const ctx = makeCheckContext(cells, values, getEngine());
    const initialRaw = (a1: A1) => ex.sheet.cells[a1]?.raw ?? '';
    const out: Record<string, StepResult> = {};
    for (const step of ex.steps) out[step.id] = runStep(step, ctx, initialRaw);
    saveSummary(ex.id, { done: Object.values(out).filter((r) => r.ok).length, total: ex.steps.length });
    return out;
  }

  function reloadFromSnapshot(cells: Snapshot) {
    const ex = get().exercise;
    if (!ex) return;
    const values = getEngine().load(cells, ex.sheet.rows, ex.sheet.cols);
    set({ cells, values, stepResults: runAllChecks(cells, values, ex) });
    persist(ex.id, ex.version, cells);
  }

  return {
    exercise: null,
    cells: {},
    values: {},
    selection: { anchor: { row: 0, col: 0 }, focus: { row: 0, col: 0 } },
    editing: null,
    fillDrag: null,
    stepResults: {},
    history: { past: [], future: [] },
    notice: null,

    loadExercise(ex) {
      if (engine) engine.destroy();
      engine = new SheetEngine();
      const saved = loadProgress(ex.id, ex.version);
      const cells: Snapshot = saved ? saved.cells : structuredClone(ex.sheet.cells);
      const values = engine.load(cells, ex.sheet.rows, ex.sheet.cols);
      set({
        exercise: ex,
        cells,
        values,
        selection: { anchor: { row: 0, col: 0 }, focus: { row: 0, col: 0 } },
        editing: null,
        fillDrag: null,
        history: { past: [], future: [] },
        notice: null,
        stepResults: runAllChecks(cells, values, ex),
      });
    },

    unload() {
      if (engine) engine.destroy();
      engine = null;
      set({ exercise: null, cells: {}, values: {}, editing: null, stepResults: {}, history: { past: [], future: [] } });
    },

    select(anchor, focus) {
      const ex = get().exercise;
      const a = clampAddr(anchor, ex);
      set({ selection: { anchor: a, focus: focus ? clampAddr(focus, ex) : a } });
    },

    extendSelection(focus) {
      set((s) => ({ selection: { anchor: s.selection.anchor, focus: clampAddr(focus, s.exercise) } }));
    },

    moveActive(dr, dc, extend = false) {
      const { selection, exercise } = get();
      if (extend) {
        const f = clampAddr({ row: selection.focus.row + dr, col: selection.focus.col + dc }, exercise);
        set({ selection: { anchor: selection.anchor, focus: f } });
      } else {
        const a = clampAddr({ row: selection.anchor.row + dr, col: selection.anchor.col + dc }, exercise);
        set({ selection: { anchor: a, focus: a } });
      }
    },

    startEdit(addr, initialText, mode, source) {
      const cell = get().cells[toA1(addr)];
      if (cell?.locked) {
        set({ notice: 'Deze cel is voorgegeven en kan niet gewijzigd worden.' });
        return;
      }
      set({
        editing: { addr, text: initialText, caret: initialText.length, mode, source },
        selection: { anchor: addr, focus: addr },
      });
    },

    updateEdit(patch) {
      set((s) => (s.editing ? { editing: { ...s.editing, ...patch } } : {}));
    },

    commitEdit(move) {
      const { editing } = get();
      if (!editing) return true;
      const text = editing.text;
      if (text.startsWith('=') && text.length > 1 && !getEngine().validateFormula(text)) {
        set({ editing: { ...editing, error: 'Er is een probleem met deze formule. Controleer haakjes en puntkomma’s.' } });
        return false;
      }
      const a1 = toA1(editing.addr);
      const current = get().cells[a1];
      const parsed = parseUserInput(text, current?.format);
      const patch: CellPatch = { a1, raw: text };
      if (parsed.kind === 'number' && parsed.inferredFormat && (!current?.format || current.format.kind === 'general')) {
        patch.format = parsed.inferredFormat;
      }
      set({ editing: null });
      if ((current?.raw ?? '') !== text || patch.format) get().setCells([patch]);
      const d = { down: [1, 0], up: [-1, 0], right: [0, 1], left: [0, -1], none: [0, 0] }[move];
      if (d[0] || d[1]) get().moveActive(d[0], d[1]);
      else get().select(editing.addr);
      return true;
    },

    cancelEdit() {
      const { editing } = get();
      if (!editing) return;
      set({ editing: null, selection: { anchor: editing.addr, focus: editing.addr } });
    },

    setCells(patches, opts) {
      const { cells, exercise, history } = get();
      if (!exercise) return;
      const undoable = opts?.undoable ?? true;
      const next: Snapshot = { ...cells };
      const enginePatches: Array<{ addr: Addr; cell: CellData | undefined }> = [];
      for (const p of patches) {
        const prev = next[p.a1];
        if (prev?.locked) continue;
        const cell: CellData = { ...(prev ?? { raw: '' }) };
        if (p.raw !== undefined) cell.raw = p.raw;
        if (p.format === null) delete cell.format;
        else if (p.format) cell.format = p.format;
        if (cell.raw === '' && !cell.format && !cell.style) delete next[p.a1];
        else next[p.a1] = cell;
        enginePatches.push({ addr: parseA1(p.a1), cell: next[p.a1] });
      }
      if (enginePatches.length === 0) return;
      const changes = getEngine().setCells(enginePatches);
      const values = { ...get().values };
      for (const c of changes) values[c.a1] = c.value;
      const stepResults = runAllChecks(next, values, exercise);
      set({
        cells: next,
        values,
        stepResults,
        history: undoable ? { past: [...history.past.slice(-99), cells], future: [] } : history,
      });
      persist(exercise.id, exercise.version, next);
    },

    clearSelection() {
      const r = selectionRange(get().selection);
      const patches = rangeCells(r)
        .map(toA1)
        .filter((a1) => get().cells[a1] && get().cells[a1].raw !== '')
        .map((a1) => ({ a1, raw: '' }));
      if (patches.length) get().setCells(patches);
    },

    setFillDrag(drag) {
      set({ fillDrag: drag });
    },

    fill(source, target) {
      const src = normalizeRange(source);
      const tgt = normalizeRange(target);
      const { cells, values } = get();
      const engineData = getEngine().fillRangeData(src, tgt);
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
            return { cell: cells[a1], value: values[a1]?.value ?? null };
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
            return { cell: cells[a1], value: values[a1]?.value ?? null };
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
      const { selection, cells, values } = get();
      const r = selectionRange(selection);
      const anchorA1 = toA1(selection.anchor);
      const anchorValue = values[anchorA1]?.value;
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
      const { history, cells } = get();
      const prev = history.past[history.past.length - 1];
      if (!prev) return;
      set({ history: { past: history.past.slice(0, -1), future: [cells, ...history.future] }, editing: null });
      reloadFromSnapshot(prev);
    },

    redo() {
      const { history, cells } = get();
      const next = history.future[0];
      if (!next) return;
      set({ history: { past: [...history.past, cells], future: history.future.slice(1) }, editing: null });
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
export function activeCellErrorHint(values: Record<A1, DisplayValue>, selection: Selection): string | null {
  const dv = values[toA1(selection.anchor)];
  if (!dv?.error) return null;
  return `${dv.error.text}: ${explainError(dv.error.type)}`;
}

export { selectionRange };
