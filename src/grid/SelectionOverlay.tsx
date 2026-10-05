import { useSheetStore, selectionRange } from '../store/sheetStore';
import { rangeRect, type Geometry } from './geometry';
import { sameAddr } from '../engine/address';

interface Props {
  geometry: Geometry;
  onFillHandleMouseDown: (e: React.MouseEvent) => void;
}

export function SelectionOverlay({ geometry, onFillHandleMouseDown }: Props) {
  const selection = useSheetStore((s) => s.selection);
  const fillDrag = useSheetStore((s) => s.fillDrag);
  const editing = useSheetStore((s) => (s.editing && s.editing.sheet === s.activeSheet ? s.editing : null));
  const range = selectionRange(selection);
  const rect = rangeRect(geometry, range);
  const active = rangeRect(geometry, { start: selection.anchor, end: selection.anchor });
  const multi = !sameAddr(selection.anchor, selection.focus);
  const pointRect = editing?.pointCursor ? rangeRect(geometry, { start: editing.pointAnchor ?? editing.pointCursor, end: editing.pointCursor }) : null;

  return (
    <>
      {multi && <div className="sel-range" style={rect} />}
      <div className="sel-active" style={active} />
      {fillDrag?.target && <div className="fill-preview" style={rangeRect(geometry, fillDrag.target)} />}
      {pointRect && <div className="point-cursor" style={pointRect} />}
      {!editing && (
        <div
          className="fill-handle"
          style={{ left: rect.left + rect.width - 4, top: rect.top + rect.height - 4 }}
          onMouseDown={onFillHandleMouseDown}
          title="Vulgreep: sleep om door te trekken"
        />
      )}
    </>
  );
}
