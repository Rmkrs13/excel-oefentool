import { Link } from 'react-router-dom';
import { EXERCISES } from '../exercises';
import { loadSummary } from '../store/persistence';

export function OverviewPage() {
  return (
    <div className="page overview">
      <header className="ov-header">
        <h1>Excel oefenen</h1>
        <p>Oefen de technieken uit de les in een werkblad in je browser. Je werk wordt automatisch bewaard in deze browser.</p>
      </header>
      <div className="cards">
        {EXERCISES.map((ex, i) => {
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
      <footer className="ov-footer">
        Werkt zoals een Nederlandstalige Excel: functies zoals <code>SOM</code>, argumenten gescheiden met <code>;</code>, decimalen met <code>,</code>.
      </footer>
    </div>
  );
}
