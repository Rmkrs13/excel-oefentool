import type { AnonUserDoc } from './types';

export interface Period {
  /** Begin, inclusief, als "JJJJ-MM-DD" (Brusselse datum); leeg = geen ondergrens. */
  from?: string;
  /** Einde, inclusief, als "JJJJ-MM-DD"; leeg = geen bovengrens. */
  to?: string;
}

export interface ExerciseAggregate {
  id: string;
  /** Aantal gebruikers dat de oefening opende. */
  opened: number;
  /** Aantal gebruikers dat de oefening (in de periode) volledig afmaakte. */
  completed: number;
  /** Aantal keer afgemaakt, over alle gebruikers (na een reset telt een nieuwe voltooiing mee). */
  completions: number;
  /** Totaal aantal resets. */
  resets: number;
  /** Aantal gebruikers dat minstens één keer resette. */
  resetUsers: number;
  /** Stap-id -> aantal gebruikers dat die stap juist had. */
  steps: Record<string, number>;
}

export interface DayAggregate {
  day: string;
  activeUsers: number;
  completions: number;
}

export interface Aggregate {
  /** Gebruikers die ooit iets invulden in een oefening (los van de periode). */
  uniqueUsers: number;
  /** Gebruikers die de site enkel bekeken en nooit iets invulden (los van de periode). */
  viewersOnly: number;
  /** Gebruikers die in de periode iets invulden in een oefening. */
  activeUsers: number;
  /** Gebruikers die in de periode voor het eerst iets invulden. */
  newUsers: number;
  visits: number;
  totalCompletions: number;
  totalResets: number;
  perExercise: Record<string, ExerciseAggregate>;
  /** [weekdag 0=ma..6=zo][uur 0..23] -> aantal actieve uurvakken. */
  heatmap: number[][];
  perDay: DayAggregate[];
  sources: Array<{ host: string; visits: number }>;
  embedded: number;
  embedmode: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Datum "JJJJ-MM-DD" in Europe/Brussels van een timestamp. */
export function dayOf(ts: number, tz = 'Europe/Brussels'): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(
    new Date(ts),
  );
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Weekdag van een "JJJJ-MM-DD": 0 = maandag ... 6 = zondag. */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = zondag
  return (js + 6) % 7;
}

function inPeriod(day: string, period: Period): boolean {
  if (period.from && day < period.from) return false;
  if (period.to && day > period.to) return false;
  return true;
}

/** Alle dagen van `from` tot en met `to`. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  let t = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  while (t <= end && out.length < 5000) {
    out.push(new Date(t).toISOString().slice(0, 10));
    t += DAY_MS;
  }
  return out;
}

export function aggregate(users: AnonUserDoc[], period: Period = {}, tz = 'Europe/Brussels'): Aggregate {
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const perExercise: Record<string, ExerciseAggregate> = {};
  const activePerDay = new Map<string, number>();
  const completionsPerDay = new Map<string, number>();
  const sources = new Map<string, number>();
  let uniqueUsers = 0;
  let viewersOnly = 0;
  let activeUsers = 0;
  let newUsers = 0;
  let visits = 0;
  let totalCompletions = 0;
  let totalResets = 0;
  let embedded = 0;
  let embedmode = 0;

  const tsIn = (ts: number | undefined): ts is number => ts !== undefined && inPeriod(dayOf(ts, tz), period);
  /** Timestamps in de periode; oude documenten zonder lijst vallen terug op teller + eerste timestamp. */
  const tsList = (list: number[] | undefined, count: number, first: number | undefined): number[] => {
    if (list) return list.filter(tsIn);
    return count > 0 && tsIn(first) ? Array<number>(count).fill(first) : [];
  };

  for (const u of users) {
    const buckets = Object.keys(u.activity).sort();
    if (buckets.length === 0) {
      viewersOnly++;
      continue; // enkel gekeken, nooit geoefend: telt nergens mee
    }
    uniqueUsers++;
    let active = false;
    const daysSeen = new Set<string>();
    for (const bucket of buckets) {
      const [day, hour] = bucket.split(' ');
      if (!inPeriod(day, period)) continue;
      active = true;
      daysSeen.add(day);
      const h = Number(hour);
      if (h >= 0 && h < 24) heatmap[weekdayOf(day)][h] += u.activity[bucket];
    }
    for (const day of daysSeen) activePerDay.set(day, (activePerDay.get(day) ?? 0) + 1);
    if (active) activeUsers++;
    // Nieuw = eerste oefenmoment valt in de periode.
    if (inPeriod(buckets[0].split(' ')[0], period)) newUsers++;

    // Bezoeken en herkomst zijn niet per dag bewaard: tellen we voor gebruikers met activiteit in de periode.
    if (active) {
      visits += u.visits;
      embedded += u.embedded;
      embedmode += u.embedmode;
      for (const [host, n] of Object.entries(u.sources)) sources.set(host, (sources.get(host) ?? 0) + n);
    }

    for (const [id, ex] of Object.entries(u.exercises)) {
      const agg = (perExercise[id] ??= { id, opened: 0, completed: 0, completions: 0, resets: 0, resetUsers: 0, steps: {} });
      if (tsIn(ex.opened)) agg.opened++;
      const completions = tsList(ex.completedAt, ex.completions, ex.completed);
      if (completions.length > 0) {
        agg.completed++;
        agg.completions += completions.length;
        totalCompletions += completions.length;
        for (const ts of completions) {
          const day = dayOf(ts, tz);
          completionsPerDay.set(day, (completionsPerDay.get(day) ?? 0) + 1);
        }
      }
      const resets = tsList(ex.resetAt, ex.resets, ex.resets > 0 ? ex.opened : undefined).length;
      if (resets > 0) {
        agg.resets += resets;
        agg.resetUsers++;
        totalResets += resets;
      }
      for (const [step, ts] of Object.entries(ex.steps)) if (tsIn(ts)) agg.steps[step] = (agg.steps[step] ?? 0) + 1;
    }
  }

  const days = new Set([...activePerDay.keys(), ...completionsPerDay.keys()]);
  const sortedDays = [...days].sort();
  let perDay: DayAggregate[] = [];
  if (sortedDays.length) {
    const from = period.from ?? sortedDays[0];
    const to = period.to ?? sortedDays[sortedDays.length - 1];
    perDay = daysBetween(from, to).map((day) => ({
      day,
      activeUsers: activePerDay.get(day) ?? 0,
      completions: completionsPerDay.get(day) ?? 0,
    }));
  }

  return {
    uniqueUsers,
    viewersOnly,
    activeUsers,
    newUsers,
    visits,
    totalCompletions,
    totalResets,
    perExercise,
    heatmap,
    perDay,
    sources: [...sources.entries()].map(([host, visits]) => ({ host, visits })).sort((a, b) => b.visits - a.visits || a.host.localeCompare(b.host)),
    embedded,
    embedmode,
  };
}
