import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EXERCISES } from '../exercises';
import { useSheetStore } from '../store/sheetStore';
import { Grid } from '../grid/Grid';
import { FormulaBar } from '../grid/FormulaBar';
import { Toolbar } from '../grid/Toolbar';
import { ExercisePanel } from '../components/ExercisePanel';

export function ExercisePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  /** Embed-modus (?embedmode of ?embed): enkel deze oefening, zonder terugknop naar het overzicht. */
  const embed = params.has('embedmode') || params.has('embed');
  const exercise = EXERCISES.find((e) => e.id === id);
  const loaded = useSheetStore((s) => s.exercise);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (exercise && (!loaded || loaded.id !== exercise.id)) useSheetStore.getState().loadExercise(exercise);
  }, [exercise, loaded]);
  useEffect(() => () => useSheetStore.getState().unload(), []);

  if (!exercise) {
    return (
      <div className="page">
        <p>Oefening niet gevonden.</p>
        {!embed && <Link to="/">Terug naar het overzicht</Link>}
      </div>
    );
  }
  if (!loaded || loaded.id !== exercise.id) return <div className="page">Laden...</div>;

  return (
    <div className={`exercise-page${embed ? ' embed' : ''}`}>
      <header className="ex-header">
        {!embed && (
          <Link to="/" className="back">
            ← Overzicht
          </Link>
        )}
        <h1>{exercise.title}</h1>
        <div className="ex-actions">
          {confirmReset ? (
            <span className="confirm">
              Alles wissen en opnieuw beginnen?
              <button
                className="btn danger"
                onClick={() => {
                  useSheetStore.getState().resetExercise();
                  setConfirmReset(false);
                }}
              >
                Ja, wissen
              </button>
              <button className="btn" onClick={() => setConfirmReset(false)}>
                Nee
              </button>
            </span>
          ) : (
            <button className="btn" onClick={() => setConfirmReset(true)}>
              Opnieuw beginnen
            </button>
          )}
        </div>
      </header>
      <div className="ex-body">
        <ExercisePanel />
        <main className="workbench">
          <Toolbar />
          <FormulaBar />
          <Grid />
        </main>
      </div>
    </div>
  );
}
