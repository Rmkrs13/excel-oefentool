import { useSheetStore } from '../store/sheetStore';
import { focusGrid } from './useEditorKeys';

/** Tabbladen onderaan het grid, zoals in Excel. */
export function SheetTabs() {
  const sheets = useSheetStore((s) => s.exercise?.sheets ?? []);
  const active = useSheetStore((s) => s.activeSheet);
  const editingSheet = useSheetStore((s) => s.editing?.sheet);
  if (sheets.length === 0) return null;
  return (
    <div className="sheet-tabs">
      {sheets.map((sh) => (
        <button
          key={sh.name}
          className={`sheet-tab${sh.name === active ? ' active' : ''}${editingSheet === sh.name && active !== sh.name ? ' editing' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault(); // focus niet uit de formulebalk halen tijdens point-modus
            const s = useSheetStore.getState();
            s.setActiveSheet(sh.name);
            if (!useSheetStore.getState().editing) focusGrid();
          }}
          title={sh.name}
        >
          {sh.name}
        </button>
      ))}
    </div>
  );
}
