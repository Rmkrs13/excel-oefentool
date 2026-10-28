import { describe, expect, it } from 'vitest';
import { aggregate, dayOf, daysBetween, weekdayOf } from './aggregate';
import type { AnonUserDoc } from './types';

const T = (iso: string) => new Date(iso).getTime();

function user(partial: Partial<AnonUserDoc>): AnonUserDoc {
  return {
    v: 1,
    firstSeen: T('2026-10-20T10:00:00+02:00'),
    lastSeen: T('2026-10-20T10:00:00+02:00'),
    visits: 1,
    activity: {},
    sources: { direct: 1 },
    embedded: 0,
    embedmode: 0,
    exercises: {},
    ...partial,
  };
}

describe('hulpfuncties', () => {
  it('dayOf in Brussel', () => {
    expect(dayOf(T('2026-10-28T23:30:00Z'))).toBe('2026-10-29');
  });
  it('weekdayOf: 2026-10-28 is een woensdag (2), 2026-11-01 een zondag (6)', () => {
    expect(weekdayOf('2026-10-28')).toBe(2);
    expect(weekdayOf('2026-11-01')).toBe(6);
    expect(weekdayOf('2026-10-26')).toBe(0);
  });
  it('daysBetween is inclusief', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });
});

describe('aggregate', () => {
  const u1 = user({
    activity: { '2026-10-28 14': 3, '2026-10-29 09': 1 },
    sources: { 'canvas.instructure.com': 1 },
    embedded: 1,
    embedmode: 1,
    exercises: {
      'abs-rel': {
        opened: T('2026-10-28T14:00:00+01:00'),
        completed: T('2026-10-28T14:30:00+01:00'),
        completions: 2,
        completedAt: [T('2026-10-28T14:30:00+01:00'), T('2026-10-29T09:10:00+01:00')],
        resets: 2,
        resetAt: [T('2026-10-28T14:40:00+01:00'), T('2026-10-29T09:00:00+01:00')],
        steps: { s1: T('2026-10-28T14:10:00+01:00'), s2: T('2026-10-28T14:20:00+01:00') },
      },
    },
  });
  const u2 = user({
    firstSeen: T('2026-10-01T10:00:00+02:00'),
    activity: { '2026-10-01 20': 2 },
    exercises: {
      'abs-rel': { opened: T('2026-10-01T20:00:00+02:00'), completions: 0, resets: 0, steps: { s1: T('2026-10-01T20:05:00+02:00') } },
    },
  });

  it('zonder periode telt alles', () => {
    const a = aggregate([u1, u2]);
    expect(a.uniqueUsers).toBe(2);
    expect(a.activeUsers).toBe(2);
    expect(a.visits).toBe(2);
    expect(a.totalCompletions).toBe(2);
    expect(a.totalResets).toBe(2);
    expect(a.perExercise['abs-rel']).toEqual({
      id: 'abs-rel',
      opened: 2,
      completed: 1,
      completions: 2,
      resets: 2,
      resetUsers: 1,
      steps: { s1: 2, s2: 1 },
    });
    expect(a.heatmap[2][14]).toBe(3); // woensdag 14u
    expect(a.heatmap[3][9]).toBe(1); // donderdag 9u
    expect(a.heatmap[3][20]).toBe(2); // 1 okt 2026 is een donderdag
    expect(a.sources).toEqual([
      { host: 'canvas.instructure.com', visits: 1 },
      { host: 'direct', visits: 1 },
    ]);
    expect(a.embedded).toBe(1);
    expect(a.embedmode).toBe(1);
  });

  it('perDay loopt van de eerste tot de laatste dag, met nullen tussenin', () => {
    const a = aggregate([u1, u2]);
    expect(a.perDay[0]).toEqual({ day: '2026-10-01', activeUsers: 1, completions: 0 });
    expect(a.perDay).toHaveLength(29);
    expect(a.perDay.find((d) => d.day === '2026-10-28')).toEqual({ day: '2026-10-28', activeUsers: 1, completions: 1 });
    expect(a.perDay.find((d) => d.day === '2026-10-29')).toEqual({ day: '2026-10-29', activeUsers: 1, completions: 1 });
    expect(a.perDay.find((d) => d.day === '2026-10-15')).toEqual({ day: '2026-10-15', activeUsers: 0, completions: 0 });
  });

  it('periodefilter beperkt tot de gevraagde dagen', () => {
    const a = aggregate([u1, u2], { from: '2026-10-28', to: '2026-10-28' });
    expect(a.uniqueUsers).toBe(2);
    expect(a.activeUsers).toBe(1);
    expect(a.newUsers).toBe(1); // eerste oefenmoment van u1 valt op 28 oktober
    expect(a.perExercise['abs-rel'].opened).toBe(1);
    expect(a.perExercise['abs-rel'].completed).toBe(1);
    expect(a.perExercise['abs-rel'].completions).toBe(1);
    expect(a.perExercise['abs-rel'].resets).toBe(1);
    expect(a.totalCompletions).toBe(1);
    expect(a.totalResets).toBe(1);
    expect(a.perExercise['abs-rel'].steps).toEqual({ s1: 1, s2: 1 });
    expect(a.heatmap[3][9]).toBe(0);
    expect(a.perDay).toEqual([{ day: '2026-10-28', activeUsers: 1, completions: 1 }]);
    expect(a.sources).toEqual([{ host: 'canvas.instructure.com', visits: 1 }]);
  });

  it('oud document zonder timestamplijsten valt terug op de tellers', () => {
    const old = user({
      activity: { '2026-10-20 10': 1 },
      exercises: {
        'abs-rel': { opened: T('2026-10-20T10:00:00+02:00'), completed: T('2026-10-20T10:30:00+02:00'), completions: 3, resets: 2, steps: {} },
      },
    });
    const a = aggregate([old]);
    expect(a.perExercise['abs-rel'].completed).toBe(1);
    expect(a.perExercise['abs-rel'].completions).toBe(3);
    expect(a.perExercise['abs-rel'].resets).toBe(2);
    expect(aggregate([old], { from: '2026-10-25' }).perExercise['abs-rel'].completions).toBe(0);
  });

  it('wie enkel keek en nooit iets invulde, telt niet mee', () => {
    const viewer = user({ exercises: { 'abs-rel': { opened: T('2026-10-28T10:00:00+01:00'), completions: 0, resets: 0, steps: {} } } });
    const a = aggregate([u1, viewer]);
    expect(a.uniqueUsers).toBe(1);
    expect(a.viewersOnly).toBe(1);
    expect(a.activeUsers).toBe(1);
    expect(a.visits).toBe(1);
    expect(a.perExercise['abs-rel'].opened).toBe(1);
  });

  it('nieuwe gebruikers: eerste oefenmoment in de periode', () => {
    expect(aggregate([u1, u2], { from: '2026-10-28', to: '2026-10-29' }).newUsers).toBe(1);
    expect(aggregate([u1, u2], { from: '2026-10-29', to: '2026-10-29' }).newUsers).toBe(0);
  });

  it('lege invoer', () => {
    const a = aggregate([]);
    expect(a.uniqueUsers).toBe(0);
    expect(a.perDay).toEqual([]);
    expect(a.heatmap.flat().every((n) => n === 0)).toBe(true);
  });
});
