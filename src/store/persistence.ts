import type { A1, CellData } from '../exercises/types';

export interface SavedProgress {
  version: number;
  /** Cellen per tabbladnaam. */
  sheets: Record<string, Record<A1, CellData>>;
  updatedAt: number;
}

const PREFIX = 'excel-oefen:v1:';

export function loadProgress(exerciseId: string, version: number): SavedProgress | null {
  try {
    const raw = localStorage.getItem(PREFIX + exerciseId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProgress;
    if (parsed.version !== version || !parsed.sheets) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveProgress(exerciseId: string, data: SavedProgress): void {
  try {
    localStorage.setItem(PREFIX + exerciseId, JSON.stringify(data));
  } catch {
    /* opslag niet beschikbaar (privémodus): stil negeren */
  }
}

export function clearProgress(exerciseId: string): void {
  try {
    localStorage.removeItem(PREFIX + exerciseId);
  } catch {
    /* negeren */
  }
}

/** Debounce-helper voor het opslaan. */
export function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number): (...args: T) => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: T) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export interface ProgressSummary {
  done: number;
  total: number;
}

export function saveSummary(exerciseId: string, summary: ProgressSummary): void {
  try {
    localStorage.setItem(PREFIX + 'summary:' + exerciseId, JSON.stringify(summary));
  } catch {
    /* negeren */
  }
}

export function loadSummary(exerciseId: string): ProgressSummary | null {
  try {
    const raw = localStorage.getItem(PREFIX + 'summary:' + exerciseId);
    return raw ? (JSON.parse(raw) as ProgressSummary) : null;
  } catch {
    return null;
  }
}

export function clearSummary(exerciseId: string): void {
  try {
    localStorage.removeItem(PREFIX + 'summary:' + exerciseId);
  } catch {
    /* negeren */
  }
}

export function loadLessonOpen(lessonId: string): boolean | null {
  try {
    const v = localStorage.getItem(PREFIX + 'lesson-open:' + lessonId);
    return v === null ? null : v === '1';
  } catch {
    return null;
  }
}

export function saveLessonOpen(lessonId: string, open: boolean): void {
  try {
    localStorage.setItem(PREFIX + 'lesson-open:' + lessonId, open ? '1' : '0');
  } catch {
    /* negeren */
  }
}
