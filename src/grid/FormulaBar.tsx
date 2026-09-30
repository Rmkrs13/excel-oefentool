import { useRef } from 'react';
import { useSheetStore, selectionRange, activeCellErrorHint } from '../store/sheetStore';
import { rangeToA1, toA1 } from '../engine/address';
import { useEditorKeys, acceptSuggestion } from './useEditorKeys';
import { Autocomplete } from './Autocomplete';

export function FormulaBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const selection = useSheetStore((s) => s.selection);
  const activeA1 = toA1(selection.anchor);
  const raw = useSheetStore((s) => s.cells[activeA1]?.raw ?? '');
  const values = useSheetStore((s) => s.values);
  const notice = useSheetStore((s) => s.notice);
  const { onChange, onKeyDown, onSelect, editing } = useEditorKeys(inputRef, 'formulaBar');
  const text = editing ? editing.text : raw;
  const hint = editing?.error ?? notice ?? activeCellErrorHint(values, selection);

  return (
    <div className="formula-bar-wrap">
      <div className="formula-bar">
        <div className="name-box">{rangeToA1(selectionRange(selection))}</div>
        <div className="fx">fx</div>
        <div className="formula-input-wrap">
          <input
            ref={inputRef}
            className="formula-input"
            value={text}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onSelect={onSelect}
            onFocus={() => {
              const s = useSheetStore.getState();
              if (!s.editing) s.startEdit(s.selection.anchor, s.cells[toA1(s.selection.anchor)]?.raw ?? '', 'edit', 'formulaBar');
              else if (s.editing.source !== 'formulaBar') s.updateEdit({ source: 'formulaBar' });
            }}
            spellCheck={false}
            autoComplete="off"
          />
          {editing?.source === 'formulaBar' && editing.autocomplete && (
            <Autocomplete style={{ left: 0, top: '100%' }} items={editing.autocomplete.items} index={editing.autocomplete.index} onPick={acceptSuggestion} />
          )}
        </div>
      </div>
      <div className={`formula-hint${hint ? ' show' : ''}`}>{hint ?? ' '}</div>
    </div>
  );
}
