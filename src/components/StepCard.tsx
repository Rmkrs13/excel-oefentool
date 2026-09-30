import { useState } from 'react';
import type { Step, StepResult } from '../exercises/types';
import { Markdown } from './Markdown';

interface Props {
  index: number;
  step: Step;
  result: StepResult | undefined;
  open: boolean;
  onToggle: () => void;
}

export function stepStatus(r: StepResult | undefined): 'todo' | 'ok' | 'partial' | 'wrong' {
  if (!r) return 'todo';
  if (r.ok) return 'ok';
  if (!r.touched) return 'todo';
  return r.partial ? 'partial' : 'wrong';
}

const ICON = { todo: '○', ok: '✓', partial: '!', wrong: '✗' };

export function StepCard({ index, step, result, open, onToggle }: Props) {
  const [showHint, setShowHint] = useState(false);
  const status = stepStatus(result);
  return (
    <div className={`step ${status}${open ? ' open' : ''}`}>
      <button className="step-head" onClick={onToggle}>
        <span className="step-icon">{ICON[status]}</span>
        <span className="step-num">{index + 1}.</span>
        <span className="step-title">{step.title}</span>
      </button>
      {open && (
        <div className="step-body">
          <Markdown text={step.text} />
          {status !== 'ok' && status !== 'todo' && result && (
            <ul className="feedback">
              {result.results.filter((r) => !r.ok).map((r, i) => (
                <li key={i} className={r.partial ? 'partial' : 'wrong'}>
                  {r.message}
                </li>
              ))}
            </ul>
          )}
          {status === 'ok' && <div className="feedback ok">Juist!</div>}
          {step.hint && (
            <div className="hint">
              <button className="link" onClick={() => setShowHint((v) => !v)}>
                {showHint ? 'Verberg tip' : 'Toon tip'}
              </button>
              {showHint && <Markdown text={step.hint} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
