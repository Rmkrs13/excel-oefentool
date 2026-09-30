import type { CSSProperties } from 'react';
import { TAUGHT_FUNCTIONS } from './editing/autocomplete';
import { FUNCTION_HELP } from './editing/functionHelp';

interface Props {
  style: CSSProperties;
  items: string[];
  index: number;
  onPick: (name: string) => void;
}

export function Autocomplete({ style, items, index, onPick }: Props) {
  return (
    <div className="autocomplete" style={style} onMouseDown={(e) => e.preventDefault()}>
      {items.map((name, i) => (
        <div
          key={name}
          className={`ac-item${i === index ? ' active' : ''}${TAUGHT_FUNCTIONS.includes(name) ? ' taught' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(name);
          }}
        >
          <span className="ac-name">{name}</span>
          {FUNCTION_HELP[name] && <span className="ac-help">{FUNCTION_HELP[name]}</span>}
        </div>
      ))}
      <div className="ac-footer">Tab om te kiezen</div>
    </div>
  );
}
