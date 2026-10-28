import { getStore } from '@netlify/blobs';
import type { Config } from '@netlify/functions';
import type { AnonUserDoc, UserDoc } from '../../src/analytics/types';

const CHUNK = 25;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function listUserKeys(store: ReturnType<typeof getStore>): Promise<string[]> {
  const keys: string[] = [];
  for await (const page of store.list({ prefix: 'users/', paginate: true })) {
    for (const blob of page.blobs) keys.push(blob.key);
  }
  return keys;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, DELETE' } });
  }

  const password = process.env.STATS_PASSWORD;
  if (!password) {
    return new Response('STATS_PASSWORD is niet ingesteld als omgevingsvariabele op Netlify.', { status: 503 });
  }
  const auth = req.headers.get('authorization') ?? '';
  const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!timingSafeEqual(given, password)) {
    return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } });
  }

  const store = getStore({ name: 'analytics', consistency: 'strong' });
  const keys = await listUserKeys(store);

  if (req.method === 'DELETE') {
    // Alle statistieken wissen (knop onderaan /stats).
    for (let i = 0; i < keys.length; i += CHUNK) {
      await Promise.all(keys.slice(i, i + CHUNK).map((k) => store.delete(k)));
    }
    return new Response(JSON.stringify({ deleted: keys.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const users: AnonUserDoc[] = [];
  for (let i = 0; i < keys.length; i += CHUNK) {
    const docs = await Promise.all(keys.slice(i, i + CHUNK).map((k) => store.get(k, { type: 'json' }) as Promise<UserDoc | null>));
    for (const doc of docs) {
      if (!doc) continue;
      const { uid: _uid, ...anon } = doc;
      void _uid;
      users.push(anon);
    }
  }

  return new Response(JSON.stringify({ generatedAt: Date.now(), users }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};

export const config: Config = { path: '/api/stats' };
