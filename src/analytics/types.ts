/** Gedeelde types voor de anonieme gebruiksstatistieken (client, Netlify Functions en /stats). */

export type TrackEvent =
  | { type: 'visit'; referrer: string; embedded: boolean; embedmode: boolean; path: string }
  | { type: 'open'; exercise: string }
  /** Celwijziging tijdens het oefenen; de client stuurt er hoogstens één per 5 minuten per oefening. */
  | { type: 'heartbeat'; exercise: string }
  /** Een stap is (opnieuw) juist geworden. */
  | { type: 'step'; exercise: string; step: string }
  /** Alle stappen zijn juist geworden. */
  | { type: 'complete'; exercise: string }
  | { type: 'reset'; exercise: string };

export interface TrackPayload {
  uid: string;
  events: TrackEvent[];
}

export interface ExerciseStats {
  /** Timestamp van de eerste keer openen. */
  opened: number;
  /** Timestamp van de eerste keer volledig afgemaakt. */
  completed?: number;
  /** Aantal keer volledig afgemaakt (één keer per poging; een reset start een nieuwe poging). */
  completions: number;
  /** Timestamps van elke voltooiing (beperkt tot de laatste 200). */
  completedAt?: number[];
  resets: number;
  /** Timestamps van elke reset (beperkt tot de laatste 200). */
  resetAt?: number[];
  /** Stap-id -> timestamp van de eerste keer dat de stap juist was. */
  steps: Record<string, number>;
}

/** Eén document per anonieme gebruiker, bewaard als Netlify Blob `users/<uid>.json`. */
export interface UserDoc {
  v: 1;
  uid: string;
  firstSeen: number;
  lastSeen: number;
  visits: number;
  /** Uurvak in Europe/Brussels ("2026-10-28 14") -> aantal events in dat uur. */
  activity: Record<string, number>;
  /** Referrer-host ("direct", "canvas.instructure.com") -> aantal bezoeken. */
  sources: Record<string, number>;
  /** Aantal bezoeken in een iframe. */
  embedded: number;
  /** Aantal bezoeken met ?embedmode of ?embed. */
  embedmode: number;
  exercises: Record<string, ExerciseStats>;
}

/** Wat /api/stats teruggeeft: de documenten zonder uid. */
export type AnonUserDoc = Omit<UserDoc, 'uid'>;
