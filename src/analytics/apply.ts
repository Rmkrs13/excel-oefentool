import type { ExerciseStats, TrackEvent, UserDoc } from './types';

export const TIMEZONE = 'Europe/Brussels';

const MAX_ID_LENGTH = 64;
const MAX_TIMESTAMPS = 200;

function pushTs(list: number[] | undefined, ts: number): number[] {
  const out = [...(list ?? []), ts];
  return out.length > MAX_TIMESTAMPS ? out.slice(-MAX_TIMESTAMPS) : out;
}
const MAX_HOST_LENGTH = 100;

/** Uurvak "JJJJ-MM-DD UU" in de opgegeven tijdzone. */
export function hourBucket(ts: number, tz = TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ts));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}`;
}

/** Host van een referrer-URL; leeg of ongeldig wordt "direct". */
export function referrerHost(referrer: string): string {
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).host.toLowerCase();
    return host ? host.slice(0, MAX_HOST_LENGTH) : 'direct';
  } catch {
    return 'direct';
  }
}

export function emptyDoc(uid: string, now: number): UserDoc {
  return { v: 1, uid, firstSeen: now, lastSeen: now, visits: 0, activity: {}, sources: {}, embedded: 0, embedmode: 0, exercises: {} };
}

function cleanId(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  const s = id.trim().slice(0, MAX_ID_LENGTH);
  return s ? s : null;
}

function exerciseStats(doc: UserDoc, id: string, now: number): ExerciseStats {
  return (doc.exercises[id] ??= { opened: now, completions: 0, resets: 0, steps: {} });
}

/**
 * Past events toe op het document van een gebruiker en geeft een nieuw document terug.
 * Onbekende of ongeldige events worden overgeslagen.
 */
export function applyEvents(doc: UserDoc | null, uid: string, events: TrackEvent[], now: number, tz = TIMEZONE): UserDoc {
  const next: UserDoc = doc ? structuredClone(doc) : emptyDoc(uid, now);
  next.lastSeen = Math.max(next.lastSeen, now);
  let touched = false;

  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue;
    switch (ev.type) {
      case 'visit': {
        next.visits++;
        const host = referrerHost(typeof ev.referrer === 'string' ? ev.referrer : '');
        next.sources[host] = (next.sources[host] ?? 0) + 1;
        if (ev.embedded) next.embedded++;
        if (ev.embedmode) next.embedmode++;
        touched = true;
        break;
      }
      case 'open': {
        const id = cleanId(ev.exercise);
        if (!id) continue;
        exerciseStats(next, id, now);
        touched = true;
        break;
      }
      case 'heartbeat': {
        const id = cleanId(ev.exercise);
        if (!id) continue;
        exerciseStats(next, id, now);
        touched = true;
        break;
      }
      case 'step': {
        const id = cleanId(ev.exercise);
        const step = cleanId(ev.step);
        if (!id || !step) continue;
        const ex = exerciseStats(next, id, now);
        ex.steps[step] ??= now;
        touched = true;
        break;
      }
      case 'complete': {
        const id = cleanId(ev.exercise);
        if (!id) continue;
        const ex = exerciseStats(next, id, now);
        ex.completed ??= now;
        ex.completions++;
        ex.completedAt = pushTs(ex.completedAt, now);
        touched = true;
        break;
      }
      case 'reset': {
        const id = cleanId(ev.exercise);
        if (!id) continue;
        const ex = exerciseStats(next, id, now);
        ex.resets++;
        ex.resetAt = pushTs(ex.resetAt, now);
        touched = true;
        break;
      }
      default:
        continue;
    }
  }

  if (touched) {
    const bucket = hourBucket(now, tz);
    next.activity[bucket] = (next.activity[bucket] ?? 0) + 1;
  }
  return next;
}
