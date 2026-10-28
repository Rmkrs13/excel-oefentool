import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LESSONS, EXERCISES } from '../exercises';
import { aggregate, dayOf, type Aggregate, type DayAggregate, type Period } from '../analytics/aggregate';
import type { AnonUserDoc } from '../analytics/types';

const KEY_STORAGE = 'excel-oefen:v1:stats-key';
const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
type Preset = '7' | '30' | 'all' | 'custom';

function loadKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}
function saveKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* negeren */
  }
}

function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

function fmtDay(day: string): string {
  const [y, m, d] = day.split('-');
  return `${d}/${m}/${y}`;
}

function pct(part: number, total: number): string {
  return total ? `${Math.round((part / total) * 100)}%` : '–';
}

export function StatsPage() {
  const [key, setKey] = useState(loadKey);
  const [input, setInput] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [users, setUsers] = useState<AnonUserDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preset, setPreset] = useState<Preset>('30');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const today = dayOf(Date.now());
  const [from, setFrom] = useState(shiftDay(today, -29));
  const [to, setTo] = useState(today);

  const load = useCallback(async (k: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stats', { headers: { Authorization: `Bearer ${k}` }, cache: 'no-store' });
      if (res.status === 401) {
        saveKey('');
        setKey('');
        setUsers(null);
        setError('Verkeerd wachtwoord.');
        return;
      }
      if (!res.ok) {
        setError(`${res.status}: ${(await res.text()) || 'De statistieken konden niet geladen worden.'}`);
        return;
      }
      const data = (await res.json()) as { users: AnonUserDoc[] };
      setUsers(data.users);
    } catch {
      setError('De statistieken konden niet geladen worden. Draait de site op Netlify (of via `netlify dev`)?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (key) void load(key);
  }, [key, load]);

  const period: Period = useMemo(() => {
    if (preset === 'all') return {};
    if (preset === '7') return { from: shiftDay(today, -6), to: today };
    if (preset === '30') return { from: shiftDay(today, -29), to: today };
    return { from: from || undefined, to: to || undefined };
  }, [preset, from, to, today]);

  const agg = useMemo(() => (users ? aggregate(users, period) : null), [users, period]);

  const resetAll = async () => {
    setResetting(true);
    setError(null);
    try {
      const res = await fetch('/api/stats', { method: 'DELETE', headers: { Authorization: `Bearer ${key}` } });
      if (!res.ok) {
        setError(`${res.status}: ${(await res.text()) || 'Wissen is mislukt.'}`);
        return;
      }
      setConfirmReset(false);
      await load(key);
    } catch {
      setError('Wissen is mislukt.');
    } finally {
      setResetting(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const k = input.trim();
    if (!k) return;
    saveKey(k);
    setKey(k);
    setInput('');
  };

  return (
    <div className="page stats">
      <header className="ov-header stats-header">
        <div>
          <Link to="/" className="back">
            ← Overzicht
          </Link>
          <h1>Statistieken</h1>
          <p>Anoniem gebruik van de oefentool. Een gebruiker telt als actief zodra die iets invult in een oefening; een pagina laden telt niet. Tijden in Belgische tijd.</p>
        </div>
        {key && (
          <div className="stats-actions">
            <button className="btn" onClick={() => void load(key)} disabled={loading}>
              {loading ? 'Laden...' : 'Vernieuwen'}
            </button>
            <button
              className="btn"
              onClick={() => {
                saveKey('');
                setKey('');
                setUsers(null);
              }}
            >
              Afmelden
            </button>
          </div>
        )}
      </header>

      {!key && (
        <form className="stats-login" onSubmit={submit}>
          <label htmlFor="stats-pw">Wachtwoord</label>
          <span className="pw-field">
            <input id="stats-pw" type={showPw ? 'text' : 'password'} value={input} onChange={(e) => setInput(e.target.value)} autoFocus />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
              aria-pressed={showPw}
              title={showPw ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
            >
              {showPw ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.06" />
                  <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-3.22 4.5" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </span>
          <button className="btn primary" type="submit">
            Aanmelden
          </button>
          {error && <p className="stats-error">{error}</p>}
        </form>
      )}

      {key && error && <p className="stats-error">{error}</p>}
      {key && !agg && !error && <p>Laden...</p>}

      {agg && (
        <>
          <div className="stats-filter" role="group" aria-label="Periode">
            {(
              [
                ['7', 'Laatste 7 dagen'],
                ['30', 'Laatste 30 dagen'],
                ['all', 'Alles'],
                ['custom', 'Van – tot'],
              ] as Array<[Preset, string]>
            ).map(([p, label]) => (
              <button key={p} className={`chip${preset === p ? ' active' : ''}`} onClick={() => setPreset(p)} aria-pressed={preset === p}>
                {label}
              </button>
            ))}
            {preset === 'custom' && (
              <span className="stats-dates">
                <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="Van" />
                <span>–</span>
                <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="Tot" />
              </span>
            )}
          </div>

          <Tiles agg={agg} allTime={preset === 'all'} />

          <section className="stats-section">
            <h2>Oefeningen</h2>
            <p className="stats-sub">
              Per oefening in de gekozen periode: hoeveel gebruikers ze openden en afmaakten, en hoe vaak ze in totaal werd afgemaakt
              (na een reset telt een nieuwe voltooiing opnieuw mee). Klik op een rij voor de stappen.
            </p>
            <ExerciseTables agg={agg} />
          </section>

          <section className="stats-section">
            <h2>Wanneer wordt er geoefend?</h2>
            <p className="stats-sub">Actieve gebruikers per dag.</p>
            <DayChart days={agg.perDay} />
            <p className="stats-sub">Activiteit per weekdag en uur (aantal actieve momenten).</p>
            <Heatmap data={agg.heatmap} />
          </section>

          <section className="stats-section">
            <h2>Herkomst</h2>
            <p className="stats-sub">
              Van waar komen de bezoeken van gebruikers die actief waren in de periode? Een pagina die de tool insluit kan haar adres
              verbergen; dan telt het bezoek als "direct".
            </p>
            <Sources agg={agg} />
          </section>

          <section className="stats-section stats-danger">
            <h2>Statistieken wissen</h2>
            <p className="stats-sub">
              Verwijdert alle bewaarde gegevens van alle gebruikers ({agg.uniqueUsers}). Dit kan niet ongedaan gemaakt worden. De
              voortgang van studenten in hun eigen browser blijft bestaan.
            </p>
            {confirmReset ? (
              <span className="confirm">
                Alle statistieken definitief wissen?
                <button className="btn danger" onClick={() => void resetAll()} disabled={resetting}>
                  {resetting ? 'Bezig...' : 'Ja, wissen'}
                </button>
                <button className="btn" onClick={() => setConfirmReset(false)} disabled={resetting}>
                  Nee
                </button>
              </span>
            ) : (
              <button className="btn" onClick={() => setConfirmReset(true)}>
                Alle statistieken wissen
              </button>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Tiles({ agg, allTime }: { agg: Aggregate; allTime: boolean }) {
  const tiles: Array<[string, number | string, string?]> = [
    ['Unieke gebruikers', agg.uniqueUsers, 'ooit iets ingevuld'],
    ['Actieve gebruikers', agg.activeUsers, allTime ? 'iets ingevuld' : 'iets ingevuld in de periode'],
    ['Nieuwe gebruikers', agg.newUsers, allTime ? undefined : 'in de periode'],
    ['Bezoeken', agg.visits, 'van actieve gebruikers'],
    ['Afgewerkte oefeningen', agg.totalCompletions],
    ['Resets', agg.totalResets],
    ['Alleen gekeken', agg.viewersOnly, 'nooit iets ingevuld'],
  ];
  return (
    <div className="tiles">
      {tiles.map(([label, value, note]) => (
        <div key={label} className="tile">
          <div className="tile-value">{value}</div>
          <div className="tile-label">
            {label}
            {note && <span className="tile-note"> {note}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExerciseTables({ agg }: { agg: Aggregate }) {
  const known = new Set(EXERCISES.map((e) => e.id));
  const other = Object.keys(agg.perExercise).filter((id) => !known.has(id));
  const groups = [
    ...LESSONS.map((l) => ({ id: l.id, title: l.title, exercises: l.exercises.map((e) => ({ id: e.id, title: e.title, steps: e.steps })) })),
    ...(other.length ? [{ id: 'other', title: 'Niet meer in het overzicht', exercises: other.map((id) => ({ id, title: id, steps: [] })) }] : []),
  ];
  return (
    <>
      {groups.map((g) => (
        <div key={g.id} className="stats-lesson">
          <h3>{g.title}</h3>
          <table className="stats-table">
            <thead>
              <tr>
                <th>Oefening</th>
                <th className="num">Geopend</th>
                <th className="num">Afgemaakt door</th>
                <th className="num">%</th>
                <th className="num">Keer afgemaakt</th>
                <th className="num">Resets</th>
              </tr>
            </thead>
            <tbody>
              {g.exercises.map((ex) => (
                <ExerciseRow key={ex.id} ex={ex} data={agg.perExercise[ex.id]} />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

function ExerciseRow({
  ex,
  data,
}: {
  ex: { id: string; title: string; steps: Array<{ id: string; title: string }> };
  data: Aggregate['perExercise'][string] | undefined;
}) {
  const [open, setOpen] = useState(false);
  const opened = data?.opened ?? 0;
  const completed = data?.completed ?? 0;
  const stepIds = [...ex.steps.map((s) => s.id), ...Object.keys(data?.steps ?? {}).filter((id) => !ex.steps.some((s) => s.id === id))];
  return (
    <>
      <tr className={`stats-row${open ? ' open' : ''}`} onClick={() => setOpen((v) => !v)}>
        <td>
          <span className="chevron">{open ? '▾' : '▸'}</span> {ex.title}
        </td>
        <td className="num">{opened}</td>
        <td className="num">{completed}</td>
        <td className="num">
          <span className="mini-bar" aria-hidden="true">
            <span style={{ width: pct(completed, opened) === '–' ? 0 : pct(completed, opened) }} />
          </span>
          {pct(completed, opened)}
        </td>
        <td className="num">{data?.completions ?? 0}</td>
        <td className="num">
          {data?.resets ?? 0}
          {data?.resetUsers ? <span className="muted"> ({data.resetUsers} gebr.)</span> : null}
        </td>
      </tr>
      {open && (
        <tr className="stats-steps">
          <td colSpan={6}>
            {stepIds.length === 0 ? (
              <p className="muted">Geen stappen bekend.</p>
            ) : (
              <table className="stats-table inner">
                <tbody>
                  {stepIds.map((id, i) => {
                    const n = data?.steps[id] ?? 0;
                    const title = ex.steps.find((s) => s.id === id)?.title ?? id;
                    return (
                      <tr key={id}>
                        <td>
                          {i + 1}. {title}
                        </td>
                        <td className="num">
                          <span className="mini-bar" aria-hidden="true">
                            <span style={{ width: pct(n, opened) === '–' ? 0 : pct(n, opened) }} />
                          </span>
                          {n} <span className="muted">({pct(n, opened)})</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

/** Per dag; bij meer dan 90 dagen gebundeld per week (maandag). */
function DayChart({ days }: { days: DayAggregate[] }) {
  const weekly = days.length > 90;
  const buckets = useMemo(() => {
    if (!weekly) return days.map((d) => ({ label: fmtDay(d.day), value: d.activeUsers, completions: d.completions }));
    const map = new Map<string, { value: number; completions: number }>();
    for (const d of days) {
      const [y, m, dd] = d.day.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, dd));
      const monday = new Date(date.getTime() - ((date.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
      const b = map.get(monday) ?? { value: 0, completions: 0 };
      // Actieve gebruikers per week benaderen we met het maximum per dag (unieke gebruikers per week zijn niet bewaard).
      b.value = Math.max(b.value, d.activeUsers);
      b.completions += d.completions;
      map.set(monday, b);
    }
    return [...map.entries()].map(([k, b]) => ({ label: `week van ${fmtDay(k)}`, ...b }));
  }, [days, weekly]);

  if (buckets.length === 0) return <p className="muted">Nog geen activiteit in deze periode.</p>;

  const W = 900;
  const H = 180;
  const padL = 28;
  const padB = 22;
  const padT = 8;
  const max = Math.max(1, ...buckets.map((b) => b.value));
  const innerW = W - padL - 4;
  const slot = innerW / buckets.length;
  const gap = Math.min(2, slot * 0.2);
  const barW = Math.max(1, slot - gap);
  const plotH = H - padB - padT;
  const ticks = max <= 4 ? Array.from({ length: max + 1 }, (_, i) => i) : [0, Math.round(max / 2), max];
  const labelEvery = Math.ceil(buckets.length / 8);

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Actieve gebruikers per dag">
        {ticks.map((t) => {
          const y = padT + plotH - (t / max) * plotH;
          return (
            <g key={t}>
              <line x1={padL} x2={W} y1={y} y2={y} className="grid" />
              <text x={padL - 6} y={y + 3} className="tick" textAnchor="end">
                {t}
              </text>
            </g>
          );
        })}
        {buckets.map((b, i) => {
          const h = (b.value / max) * plotH;
          const x = padL + i * slot + gap / 2;
          const y = padT + plotH - h;
          return (
            <g key={b.label} className="bar-g">
              <rect x={padL + i * slot} y={padT} width={slot} height={plotH} className="hit" />
              {b.value > 0 && <rect x={x} y={y} width={barW} height={h} rx={Math.min(3, barW / 2)} className="bar-mark" />}
              <title>
                {b.label}: {b.value} actieve gebruiker{b.value === 1 ? '' : 's'}, {b.completions} afgewerkt
              </title>
              {i % labelEvery === 0 && (
                <text x={padL + i * slot + slot / 2} y={H - 6} className="tick" textAnchor="middle">
                  {weekly ? b.label.replace('week van ', '').slice(0, 5) : b.label.slice(0, 5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {weekly && <figcaption className="muted">Per week: hoogste aantal actieve gebruikers op één dag in die week.</figcaption>}
    </figure>
  );
}

function Heatmap({ data }: { data: number[][] }) {
  const max = Math.max(1, ...data.flat());
  return (
    <div className="heatmap" role="table" aria-label="Activiteit per weekdag en uur">
      <div className="heat-corner" />
      {Array.from({ length: 24 }, (_, h) => (
        <div key={h} className="heat-hour">
          {h % 3 === 0 ? `${h}u` : ''}
        </div>
      ))}
      {data.map((row, d) => (
        <div key={d} className="heat-row" role="row">
          <div className="heat-day">{WEEKDAYS[d]}</div>
          {row.map((n, h) => (
            <div
              key={h}
              className="heat-cell"
              role="cell"
              style={{ '--v': n / max } as React.CSSProperties}
              title={`${WEEKDAYS[d]} ${h}u–${h + 1}u: ${n}`}
            >
              <span className="sr-only">{n}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Sources({ agg }: { agg: Aggregate }) {
  const total = agg.sources.reduce((s, x) => s + x.visits, 0);
  return (
    <div className="stats-sources">
      <table className="stats-table">
        <thead>
          <tr>
            <th>Verwijzende site</th>
            <th className="num">Bezoeken</th>
            <th className="num">%</th>
          </tr>
        </thead>
        <tbody>
          {agg.sources.length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                Nog geen bezoeken in deze periode.
              </td>
            </tr>
          )}
          {agg.sources.map((s) => (
            <tr key={s.host}>
              <td>{s.host === 'direct' ? 'direct (geen verwijzer)' : s.host}</td>
              <td className="num">{s.visits}</td>
              <td className="num">{pct(s.visits, total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="tiles small">
        <div className="tile">
          <div className="tile-value">{agg.embedded}</div>
          <div className="tile-label">
            Bezoeken in een iframe <span className="tile-note">{pct(agg.embedded, agg.visits)}</span>
          </div>
        </div>
        <div className="tile">
          <div className="tile-value">{agg.embedmode}</div>
          <div className="tile-label">
            Bezoeken met ?embedmode <span className="tile-note">{pct(agg.embedmode, agg.visits)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
