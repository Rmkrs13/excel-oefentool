import { useMemo } from 'react';
import { useSheetStore } from '../store/sheetStore';
import { Cell } from './Cell';
import { CellEditor } from './CellEditor';
import { SelectionOverlay } from './SelectionOverlay';
import { HEADER_HEIGHT, HEADER_WIDTH, ROW_HEIGHT, makeGeometry } from './geometry';
import { colToLetters, toA1 } from '../engine/address';
import { useGridInteraction } from './useGridInteraction';
import { SheetTabs } from './SheetTabs';

export function Grid() {
  const exercise = useSheetStore((s) => s.exercise);
  const activeSheet = useSheetStore((s) => s.activeSheet);
  const selection = useSheetStore((s) => s.selection);
  const def = useMemo(() => exercise?.sheets.find((d) => d.name === activeSheet), [exercise, activeSheet]);
  const geometry = useMemo(() => makeGeometry(def), [def]);
  const { onMouseDown, onDoubleClick, onFillHandleMouseDown, onKeyDown } = useGridInteraction();

  const rows = useMemo(() => {
    const out: Array<{ row: number; cells: Array<{ a1: string; col: number }> }> = [];
    for (let r = 0; r < geometry.rows; r++) {
      const cells = [];
      for (let c = 0; c < geometry.cols; c++) cells.push({ a1: toA1({ row: r, col: c }), col: c });
      out.push({ row: r, cells });
    }
    return out;
  }, [geometry]);

  const r0 = Math.min(selection.anchor.row, selection.focus.row);
  const r1 = Math.max(selection.anchor.row, selection.focus.row);
  const c0 = Math.min(selection.anchor.col, selection.focus.col);
  const c1 = Math.max(selection.anchor.col, selection.focus.col);

  const template = `${HEADER_WIDTH}px ${geometry.colWidths.map((w) => `${w}px`).join(' ')}`;

  return (
    <>
    <div className="grid-scroll" tabIndex={0} onKeyDown={onKeyDown} key={activeSheet}>
      <div
        className="grid"
        style={{ gridTemplateColumns: template, width: HEADER_WIDTH + geometry.totalWidth }}
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
      >
        <div className="hdr corner" style={{ height: HEADER_HEIGHT }} />
        {geometry.colWidths.map((_, c) => (
          <div key={c} className={`hdr col-hdr${c >= c0 && c <= c1 ? ' sel' : ''}`} style={{ height: HEADER_HEIGHT }}>
            {colToLetters(c)}
          </div>
        ))}
        {rows.map((r) => (
          <div key={r.row} style={{ display: 'contents' }}>
            <div className={`hdr row-hdr${r.row >= r0 && r.row <= r1 ? ' sel' : ''}`} style={{ height: ROW_HEIGHT }}>
              {r.row + 1}
            </div>
            {r.cells.map((c) => (
              <Cell key={c.a1} a1={c.a1} row={r.row} col={c.col} />
            ))}
          </div>
        ))}
        <div className="overlay" style={{ left: HEADER_WIDTH, top: HEADER_HEIGHT, width: geometry.totalWidth, height: geometry.totalHeight }}>
          <SelectionOverlay geometry={geometry} onFillHandleMouseDown={onFillHandleMouseDown} />
          <CellEditor geometry={geometry} />
        </div>
      </div>
    </div>
    <SheetTabs />
    </>
  );
}
