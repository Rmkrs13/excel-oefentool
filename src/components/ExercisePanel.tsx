import { useEffect, useState } from 'react';
import { useSheetStore } from '../store/sheetStore';
import { StepCard, stepStatus } from './StepCard';
import { Markdown } from './Markdown';

export function ExercisePanel() {
  const exercise = useSheetStore((s) => s.exercise);
  const stepResults = useSheetStore((s) => s.stepResults);
  const [openId, setOpenId] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);

  const firstOpen = exercise?.steps.find((st) => stepStatus(stepResults[st.id]) !== 'ok')?.id ?? null;
  useEffect(() => {
    if (auto) setOpenId(firstOpen);
  }, [auto, firstOpen]);

  if (!exercise) return null;
  const done = exercise.steps.filter((st) => stepResults[st.id]?.ok).length;

  return (
    <aside className="panel">
      <div className="panel-progress">
        <div className="bar">
          <div className="bar-fill" style={{ width: `${(done / exercise.steps.length) * 100}%` }} />
        </div>
        <span>
          {done}/{exercise.steps.length} stappen
        </span>
      </div>
      {exercise.intro && <Markdown text={exercise.intro} />}
      <div className="steps">
        {exercise.steps.map((st, i) => (
          <StepCard
            key={st.id}
            index={i}
            step={st}
            result={stepResults[st.id]}
            open={openId === st.id}
            onToggle={() => {
              setAuto(false);
              setOpenId(openId === st.id ? null : st.id);
            }}
          />
        ))}
      </div>
      {done === exercise.steps.length && <div className="all-done">Alle stappen zijn juist. Goed gedaan!</div>}
    </aside>
  );
}
