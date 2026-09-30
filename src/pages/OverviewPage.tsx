import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LESSONS, type Lesson } from '../exercises';
import { loadLessonOpen, loadSummary, saveLessonOpen } from '../store/persistence';

function lessonProgress(lesson: Lesson) {
  let done = 0;
  for (const ex of lesson.exercises) {
    const s = loadSummary(ex.id);
    if (s && s.done === ex.steps.length) done++;
  }
  return { done, total: lesson.exercises.length };
}

/** Standaard staat de eerste les open die nog niet volledig af is (of de laatste als alles af is). */
function defaultOpenId(): string | null {
  const first = LESSONS.find((l) => {
    const p = lessonProgress(l);
    return p.done < p.total;
  });
  return (first ?? LESSONS[LESSONS.length - 1])?.id ?? null;
}

function initialOpenState(): Record<string, boolean> {
  const def = defaultOpenId();
  const out: Record<string, boolean> = {};
  for (const l of LESSONS) {
    const saved = loadLessonOpen(l.id);
    out[l.id] = saved ?? l.id === def;
  }
  return out;
}

export function OverviewPage() {
  const [open, setOpen] = useState<Record<string, boolean>>(initialOpenState);

  const toggle = (id: string) => {
    const next = !open[id];
    setOpen({ ...open, [id]: next });
    saveLessonOpen(id, next);
  };

  return (
    <div className="page overview">
      <header className="ov-header">
        <h1>Excel oefenen</h1>
        <p>Oefen de technieken uit de les in een werkblad in je browser. Je werk wordt automatisch bewaard in deze browser.</p>
      </header>
      {LESSONS.map((lesson) => {
        const p = lessonProgress(lesson);
        const isOpen = open[lesson.id];
        return (
          <section key={lesson.id} className={`lesson${isOpen ? ' open' : ''}${p.done === p.total ? ' complete' : ''}`}>
            <button className="lesson-head" onClick={() => toggle(lesson.id)} aria-expanded={isOpen}>
              <span className="chevron">{isOpen ? '▾' : '▸'}</span>
              <span className="lesson-title">{lesson.title}</span>
              <span className="lesson-progress">
                {p.done}/{p.total} oefeningen af
              </span>
            </button>
            {isOpen && (
              <div className="lesson-body">
                {lesson.description && <p className="lesson-desc">{lesson.description}</p>}
                <div className="cards">
                  {lesson.exercises.map((ex, i) => {
                    const s = loadSummary(ex.id);
                    const done = s?.done ?? 0;
                    const total = ex.steps.length;
                    return (
                      <Link key={ex.id} to={`/oefening/${ex.id}`} className={`card${done === total ? ' complete' : ''}`}>
                        <div className="card-num">Oefening {i + 1}</div>
                        <h2>{ex.title}</h2>
                        <p>{ex.intro?.split('\n')[0]}</p>
                        <div className="card-footer">
                          <div className="bar">
                            <div className="bar-fill" style={{ width: `${(done / total) * 100}%` }} />
                          </div>
                          <span>
                            {done}/{total} stappen
                          </span>
                          <span className="card-cta">{done === 0 ? 'Start' : done === total ? 'Bekijk' : 'Verder'} →</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        );
      })}
      <footer className="ov-footer">
        &copy; {new Date().getFullYear()}{' '}
        <a href="https://www.linkedin.com/in/lars-rmkrs/" target="_blank" rel="noopener noreferrer">
          Lars Raeymaekers
        </a>
      </footer>
    </div>
  );
}
