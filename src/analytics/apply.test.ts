import { describe, expect, it } from 'vitest';
import { applyEvents, hourBucket, referrerHost } from './apply';
import type { UserDoc } from './types';

const T0 = Date.UTC(2026, 9, 28, 13, 5); // 28 okt 2026 13:05 UTC = 14:05 in Brussel (wintertijd)

describe('hourBucket', () => {
  it('bucket in Brusselse wintertijd', () => {
    expect(hourBucket(T0)).toBe('2026-10-28 14');
  });
  it('bucket in Brusselse zomertijd', () => {
    expect(hourBucket(Date.UTC(2026, 6, 1, 22, 30))).toBe('2026-07-02 00');
  });
  it('middernacht wordt uur 00, niet 24', () => {
    expect(hourBucket(Date.UTC(2026, 0, 15, 23, 10))).toBe('2026-01-16 00');
  });
});

describe('referrerHost', () => {
  it('leeg of ongeldig is direct', () => {
    expect(referrerHost('')).toBe('direct');
    expect(referrerHost('geen url')).toBe('direct');
  });
  it('geeft enkel de host terug', () => {
    expect(referrerHost('https://Canvas.Instructure.com/courses/12/pages/x?y=1')).toBe('canvas.instructure.com');
  });
});

describe('applyEvents', () => {
  it('maakt een nieuw document bij het eerste event', () => {
    const doc = applyEvents(null, 'u1', [{ type: 'visit', referrer: '', embedded: false, embedmode: false, path: '/' }], T0);
    expect(doc.uid).toBe('u1');
    expect(doc.firstSeen).toBe(T0);
    expect(doc.lastSeen).toBe(T0);
    expect(doc.visits).toBe(1);
    expect(doc.sources).toEqual({ direct: 1 });
    expect(doc.activity).toEqual({}); // een bezoek is nog geen oefenen
  });

  it('openen zonder iets in te vullen telt niet als activiteit, invullen wel', () => {
    let doc = applyEvents(null, 'u1', [{ type: 'open', exercise: 'abs-rel' }], T0);
    expect(doc.activity).toEqual({});
    expect(doc.exercises['abs-rel'].opened).toBe(T0);
    doc = applyEvents(doc, 'u1', [{ type: 'heartbeat', exercise: 'abs-rel' }], T0 + 1000);
    expect(doc.activity).toEqual({ '2026-10-28 14': 1 });
  });

  it('telt iframe en embedmode bij een bezoek', () => {
    const doc = applyEvents(
      null,
      'u1',
      [{ type: 'visit', referrer: 'https://canvas.instructure.com/x', embedded: true, embedmode: true, path: '/oefening/abs-rel' }],
      T0,
    );
    expect(doc.embedded).toBe(1);
    expect(doc.embedmode).toBe(1);
    expect(doc.sources).toEqual({ 'canvas.instructure.com': 1 });
  });

  it('bewaart per oefening opened, steps, completed en resets', () => {
    let doc: UserDoc | null = null;
    doc = applyEvents(doc, 'u1', [{ type: 'open', exercise: 'abs-rel' }], T0);
    doc = applyEvents(doc, 'u1', [{ type: 'step', exercise: 'abs-rel', step: 's1' }], T0 + 1000);
    doc = applyEvents(doc, 'u1', [{ type: 'step', exercise: 'abs-rel', step: 's1' }], T0 + 2000);
    doc = applyEvents(doc, 'u1', [{ type: 'complete', exercise: 'abs-rel' }], T0 + 3000);
    doc = applyEvents(doc, 'u1', [{ type: 'reset', exercise: 'abs-rel' }], T0 + 4000);
    doc = applyEvents(doc, 'u1', [{ type: 'complete', exercise: 'abs-rel' }], T0 + 5000);
    const ex = doc.exercises['abs-rel'];
    expect(ex.opened).toBe(T0);
    expect(ex.steps).toEqual({ s1: T0 + 1000 });
    expect(ex.completed).toBe(T0 + 3000);
    expect(ex.completions).toBe(2);
    expect(ex.completedAt).toEqual([T0 + 3000, T0 + 5000]);
    expect(ex.resets).toBe(1);
    expect(ex.resetAt).toEqual([T0 + 4000]);
    expect(doc.lastSeen).toBe(T0 + 5000);
    expect(doc.activity['2026-10-28 14']).toBe(5); // het openen telt niet mee
  });

  it('wijzigt het oorspronkelijke document niet', () => {
    const first = applyEvents(null, 'u1', [{ type: 'open', exercise: 'a' }], T0);
    applyEvents(first, 'u1', [{ type: 'reset', exercise: 'a' }], T0);
    expect(first.exercises.a.resets).toBe(0);
  });

  it('slaat ongeldige events over en telt dan geen activiteit', () => {
    const bad = [{ type: 'open', exercise: '' }, { type: 'onzin' }, null] as unknown as Parameters<typeof applyEvents>[2];
    const doc = applyEvents(null, 'u1', bad, T0);
    expect(doc.exercises).toEqual({});
    expect(doc.activity).toEqual({});
  });

  it('kapt lange id\'s af', () => {
    const doc = applyEvents(null, 'u1', [{ type: 'open', exercise: 'x'.repeat(200) }], T0);
    expect(Object.keys(doc.exercises)[0]).toHaveLength(64);
  });
});
