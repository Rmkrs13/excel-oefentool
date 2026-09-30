import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EXERCISES } from '../exercises';
import { useSheetStore } from '../store/sheetStore';
import { Grid } from '../grid/Grid';
import { FormulaBar } from '../grid/FormulaBar';
import { Toolbar } from '../grid/Toolbar';
import { ExercisePanel } from '../components/ExercisePanel';

export function ExercisePage() {
  const { id } = useParams();
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
        <Link to="/">Terug naar het overzicht</Link>
      </div>
    );
  }
  if (!loaded || loaded.id !== exercise.id) return <div className="page">Laden...</div>;

  return (
    <div className="exercise-page">
      <header className="ex-header">
        <Link to="/" className="back">
          ← Overzicht
        </Link>
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
