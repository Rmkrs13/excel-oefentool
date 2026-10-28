import type { TrackEvent, TrackPayload } from './types';

/**
 * Anonieme gebruiksstatistieken. Een willekeurig id in localStorage maakt het mogelijk unieke
 * gebruikers te tellen; er wordt geen naam, account of IP bewaard. Events worden gebundeld en
 * naar /api/track gestuurd (Netlify Function). Fouten worden stil genegeerd: zonder functions
 * (bv. `npm run dev`) werkt de tool gewoon verder.
 */

const UID_KEY = 'excel-oefen:v1:uid';
const SESSION_KEY = 'excel-oefen:v1:visited';
const ENDPOINT = '/api/track';
const FLUSH_DELAY = 1500;
const HEARTBEAT_INTERVAL = 5 * 60 * 1000;
const MAX_QUEUE = 50;

function randomUid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
}

let uid: string | null = null;
export function getUid(): string {
  if (uid) return uid;
  try {
    const stored = localStorage.getItem(UID_KEY);
    if (stored) return (uid = stored);
    uid = randomUid();
    localStorage.setItem(UID_KEY, uid);
    return uid;
  } catch {
    return (uid = randomUid());
  }
}

let queue: TrackEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;
let listenersReady = false;

async function send(events: TrackEvent[]): Promise<void> {
  const payload: TrackPayload = { uid: getUid(), events };
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    /* geen netwerk of geen functions: negeren */
  }
}

function flush(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  // Nooit twee requests tegelijk: de server doet read-modify-write per gebruiker.
  const chain = (inFlight ?? Promise.resolve()).then(() => send(batch));
  inFlight = chain;
  void chain.finally(() => {
    if (inFlight === chain) inFlight = null;
  });
}

function ensureListeners(): void {
  if (listenersReady || typeof document === 'undefined') return;
  listenersReady = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}

export function track(event: TrackEvent): void {
  ensureListeners();
  queue.push(event);
  if (queue.length >= MAX_QUEUE) {
    flush();
    return;
  }
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, FLUSH_DELAY);
}

/** Eén bezoek per browsersessie registreren, met herkomst en iframe-informatie. */
export function trackVisit(): void {
  if (location.pathname.startsWith('/stats')) return; // de statistiekpagina zelf telt niet mee
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* sessionStorage onbeschikbaar: bezoek toch tellen */
  }
  let embedded = false;
  try {
    embedded = window.self !== window.top;
  } catch {
    embedded = true; // cross-origin frame: toegang tot window.top geweigerd
  }
  const params = new URLSearchParams(location.search);
  track({
    type: 'visit',
    referrer: document.referrer ?? '',
    embedded,
    embedmode: params.has('embedmode') || params.has('embed'),
    path: location.pathname,
  });
}

const lastHeartbeat = new Map<string, number>();
/** Celwijziging in een oefening: hoogstens één heartbeat per 5 minuten per oefening. */
export function trackHeartbeat(exercise: string): void {
  const now = Date.now();
  const last = lastHeartbeat.get(exercise) ?? 0;
  if (now - last < HEARTBEAT_INTERVAL) return;
  lastHeartbeat.set(exercise, now);
  track({ type: 'heartbeat', exercise });
}
