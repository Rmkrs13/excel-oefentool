import { useRef } from 'react';
import { useSheetStore } from '../store/sheetStore';
import { cellRect, type Geometry } from './geometry';
import { useEditorKeys, acceptSuggestion } from './useEditorKeys';
import { Autocomplete } from './Autocomplete';

interface Props {
  geometry: Geometry;
}

export function CellEditor({ geometry }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { onChange, onKeyDown, onSelect, editing } = useEditorKeys(inputRef, 'cell');
  const activeSheet = useSheetStore((s) => s.activeSheet);
  if (!editing || editing.sheet !== activeSheet) return null;
  const rect = cellRect(geometry, editing.addr);
  const width = Math.max(rect.width, Math.min(400, editing.text.length * 8 + 24));
  return (
    <>
      <input
        ref={inputRef}
        className="cell-editor"
        style={{ left: rect.left, top: rect.top, width, height: rect.height }}
        value={editing.text}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onSelect={onSelect}
        autoFocus={editing.source === 'cell'}
        spellCheck={false}
        autoComplete="off"
      />
      {editing.autocomplete && (
        <Autocomplete
          style={{ left: rect.left, top: rect.top + rect.height }}
          items={editing.autocomplete.items}
          index={editing.autocomplete.index}
          onPick={acceptSuggestion}
        />
      )}
    </>
  );
}
