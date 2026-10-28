import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { OverviewPage } from './pages/OverviewPage';
import { ExercisePage } from './pages/ExercisePage';
import { StatsPage } from './pages/StatsPage';
import { trackVisit } from './analytics/track';

export function App() {
  useEffect(() => {
    trackVisit();
  }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/oefening/:id" element={<ExercisePage />} />
        <Route path="/stats" element={<StatsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
