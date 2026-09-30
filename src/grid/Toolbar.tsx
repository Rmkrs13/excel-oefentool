import { useSheetStore } from '../store/sheetStore';
import { FORMAT_PRESETS, formatCode, parseFormatCode } from '../format/numberFormat';
import { toA1 } from '../engine/address';
import { focusGrid } from './useEditorKeys';

export function Toolbar() {
  const selection = useSheetStore((s) => s.selection);
  const activeFormat = useSheetStore((s) => s.cells[toA1(selection.anchor)]?.format);
  const canUndo = useSheetStore((s) => s.history.past.length > 0);
  const canRedo = useSheetStore((s) => s.history.future.length > 0);
  const code = formatCode(activeFormat);
  const known = FORMAT_PRESETS.some((p) => p.code === code);

  const apply = (fn: () => void) => () => {
    fn();
    focusGrid();
  };
  const st = () => useSheetStore.getState();

  return (
    <div className="toolbar">
      <button className="tb-btn" onClick={apply(() => st().undo())} disabled={!canUndo} title="Ongedaan maken (Ctrl+Z)">
        ↶
      </button>
      <button className="tb-btn" onClick={apply(() => st().redo())} disabled={!canRedo} title="Opnieuw (Ctrl+Y)">
        ↷
      </button>
      <span className="tb-sep" />
      <label className="tb-label">Getalnotatie</label>
      <select
        className="tb-select"
        value={known ? code : '__custom'}
        onChange={(e) => {
          const v = e.target.value;
          st().setFormatOnSelection(v === 'Standaard' ? null : parseFormatCode(v));
          focusGrid();
        }}
      >
        {FORMAT_PRESETS.map((p) => (
          <option key={p.code} value={p.code}>
            {p.label} ({p.code})
          </option>
        ))}
        {!known && <option value="__custom">{code}</option>}
      </select>
      <button className="tb-btn" onClick={apply(() => st().setFormatOnSelection(parseFormatCode('€ #.##0,00')))} title="Valuta (€ #.##0,00)">
        €
      </button>
      <button className="tb-btn" onClick={apply(() => st().setFormatOnSelection(parseFormatCode('0%')))} title="Percentage (0%)">
        %
      </button>
      <button className="tb-btn" onClick={apply(() => st().setFormatOnSelection(parseFormatCode('#.##0')))} title="Duizendtalscheiding (#.##0)">
        000
      </button>
      <button className="tb-btn" onClick={apply(() => st().adjustDecimalsOnSelection(1))} title="Meer decimalen">
        ,0 →
      </button>
      <button className="tb-btn" onClick={apply(() => st().adjustDecimalsOnSelection(-1))} title="Minder decimalen">
        ← ,0
      </button>
      <button className="tb-btn" onClick={apply(() => st().setFormatOnSelection({ kind: 'text' }))} title="Tekst (@)">
        Tekst
      </button>
      <button className="tb-btn" onClick={apply(() => st().setFormatOnSelection({ kind: 'date', dateCode: 'dd/mm/jjjj' }))} title="Datum (dd/mm/jjjj)">
        Datum
      </button>
    </div>
  );
}
