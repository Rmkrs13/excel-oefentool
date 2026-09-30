import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { OverviewPage } from './pages/OverviewPage';
import { ExercisePage } from './pages/ExercisePage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/oefening/:id" element={<ExercisePage />} />
      </Routes>
    </BrowserRouter>
  );
}
