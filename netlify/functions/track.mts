import { getStore } from '@netlify/blobs';
import type { Config } from '@netlify/functions';
import { applyEvents } from '../../src/analytics/apply';
import type { TrackEvent, TrackPayload, UserDoc } from '../../src/analytics/types';

const UID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_EVENTS = 50;
const KNOWN_TYPES = new Set<TrackEvent['type']>(['visit', 'open', 'heartbeat', 'step', 'complete', 'reset']);

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });

  let payload: TrackPayload;
  try {
    payload = (await req.json()) as TrackPayload;
  } catch {
    return new Response('Bad Request', { status: 400 });
  }
  if (!payload || typeof payload.uid !== 'string' || !UID_RE.test(payload.uid) || !Array.isArray(payload.events)) {
    return new Response('Bad Request', { status: 400 });
  }
  const events = payload.events
    .filter((e): e is TrackEvent => !!e && typeof e === 'object' && KNOWN_TYPES.has((e as TrackEvent).type))
    .slice(0, MAX_EVENTS);
  if (events.length === 0) return new Response(null, { status: 204 });

  const uid = payload.uid.toLowerCase();
  const store = getStore({ name: 'analytics', consistency: 'strong' });
  const key = `users/${uid}.json`;
  const current = (await store.get(key, { type: 'json' })) as UserDoc | null;
  const next = applyEvents(current, uid, events, Date.now());
  await store.setJSON(key, next);
  return new Response(null, { status: 204 });
};

export const config: Config = { path: '/api/track' };
