"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { supabase } from "@/lib/supabase/browser";
import { Login, SignOut } from "./Panels";
import panel from "./Panels.module.css";
import styles from "./Master.module.css";

type Day = { day: string; plays: number; listeners: number };
type Stats = {
  at: string;
  counts: { projects: number; panas: number; versions: number; tracks: number; comments: number; open_invites: number; stored_bytes: number; bucket_bytes: number; bucket_files: number };
  plays: { day: number; week: number; month: number; listeners_week: number };
  by_day: Day[];
  top_tracks: { name: string; catalogue_no: string; title: string; plays: number; listeners: number }[];
  projects: { catalogue_no: string; artist: string; title: string; versions: number; tracks: number; bytes: number; panas: number; plays: number; last_play: string | null }[];
  panas: { name: string; email: string; projects: number; plays: number; last_play: string | null }[];
  recent_plays: { at: string; email: string; track: string; catalogue_no: string }[];
  recent_comments: { created_at: string; author_name: string; body: string; time_seconds: number; resolved: boolean; catalogue_no: string }[];
  health: Record<string, number>;
};

const FREE_TIER = 1_000_000_000; // Supabase free plan: 1 GB of file storage
const CHECKS = ["tracks_without_key", "tracks_missing_file", "files_without_track", "projects_without_current", "projects_without_tracks", "panas_without_access", "heavy_listeners_24h"] as const;

const bytes = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(2)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`);
const when = (iso: string | null, locale: string, never: string) => (iso ? new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : never);
const shortDay = (iso: string, locale: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { month: "short", day: "numeric" });

type Who = "loading" | "out" | "other" | "owner";

/** Only the owner gets past this; the database refuses everyone else too. */
export function MasterControl({ locale, t }: { locale: Locale; t: Dictionary }) {
  const m = t.master;
  const [who, setWho] = useState<Who>("loading");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return setWho("other");
    setBusy(true);
    setError(null);
    const { data, error } = await sb.rpc("master_stats");
    setBusy(false);
    if (error) {
      if (error.code === "42501") return setWho("other");
      return setError(error.message);
    }
    setStats(data as Stats);
    setWho("owner");
  }, []);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return setWho("other");
    (async () => {
      const { data } = await sb.auth.getUser();
      if (!data.user) return setWho("out");
      await load();
    })();
  }, [load]);

  if (who === "loading") return <p className={panel.narrow}>…</p>;
  if (who === "out") return <Login locale={locale} t={t} note={m.signInFirst} next="master" />;
  if (who === "other") {
    return (
      <section className={panel.narrow}>
        <h1 className={panel.h1}>{m.title}</h1>
        <p className={panel.lead}>{m.notOwner}</p>
        <div className={panel.actions}>
          <Link href={`/${locale}/sessions`} className="btn">
            {m.back}
          </Link>
          <SignOut locale={locale} t={t} />
        </div>
      </section>
    );
  }
  if (!stats) {
    return (
      <section className={panel.narrow}>
        <p className={panel.err} role="alert">
          {error}
        </p>
        <button type="button" className="btn" onClick={load}>
          {m.refresh}
        </button>
      </section>
    );
  }

  const used = stats.counts.bucket_bytes;
  const pct = Math.min(100, (used / FREE_TIER) * 100);

  return (
    <section className={panel.wide}>
      <div className={panel.headRow}>
        <h1 className={panel.h1}>{m.title}</h1>
        <span className={`caps ${styles.lock}`}>
          <Icon name="lock" float={false} /> {m.readOnly}
        </span>
        <div className={panel.actions}>
          <button type="button" className="btn" onClick={load} disabled={busy}>
            {m.refresh}
          </button>
          <Link href={`/${locale}/sessions`} className="btn">
            {m.back}
          </Link>
          <SignOut locale={locale} t={t} />
        </div>
      </div>
      <p className={panel.lead}>{m.lead}</p>
      <p className={`mono ${styles.stamp}`}>{m.updated.replace("{t}", when(stats.at, locale, ""))}</p>
      {error && (
        <p className={panel.err} role="alert">
          {error}
        </p>
      )}

      <ul className={styles.tiles}>
        <Tile label={m.tiles.plays} value={stats.plays.week} sub={`${stats.plays.day} / 24 h`} />
        <Tile label={m.tiles.listeners} value={stats.plays.listeners_week} />
        <Tile label={m.tiles.panas} value={stats.counts.panas} sub={`${stats.counts.open_invites} ${m.openInvites.toLowerCase()}`} />
        <Tile label={m.tiles.projects} value={stats.counts.projects} sub={`${stats.counts.versions} ${m.versions.toLowerCase()}`} />
        <Tile label={m.tiles.tracks} value={stats.counts.tracks} sub={`${stats.counts.bucket_files} ${m.bucket.toLowerCase()}`} />
        <li className={styles.tile}>
          <p className={`caps ${styles.tileLabel}`}>{m.tiles.storage}</p>
          <p className={styles.tileValue}>{bytes(used)}</p>
          <span className={styles.meter} role="img" aria-label={`${pct.toFixed(1)}% ${m.storageOf}`}>
            <span style={{ transform: `scaleX(${pct / 100})` }} />
          </span>
          <p className={`mono ${styles.tileSub}`}>
            {pct.toFixed(1)}% {m.storageOf}
          </p>
        </li>
      </ul>

      <h2 className={`caps ${panel.h2}`}>{m.activity}</h2>
      <p className={styles.note}>{m.activityNote}</p>
      <DayChart days={stats.by_day} locale={locale} m={m} />

      <div className={panel.cols}>
        <div>
          <h2 className={`caps ${panel.h2}`}>{m.projects}</h2>
          <Table
            head={[m.project, m.versions, m.tracks, m.size, m.shared, m.plays30, m.lastPlay]}
            rows={stats.projects.map((p) => [
              <span key="p">
                <span className={`mono ${styles.cat}`}>{p.catalogue_no}</span> {p.title} <span className={panel.muted}>{p.artist}</span>
              </span>,
              p.versions,
              p.tracks,
              bytes(p.bytes),
              p.panas,
              p.plays,
              when(p.last_play, locale, m.never),
            ])}
            empty={m.noPlays}
          />

          <h2 className={`caps ${panel.h2}`}>{m.topTracks}</h2>
          <Table
            head={[m.track, m.project, m.plays, m.listeners]}
            rows={stats.top_tracks.map((x) => [x.name, <span key="c" className="mono">{x.catalogue_no}</span>, x.plays, x.listeners])}
            empty={m.noPlays}
          />
        </div>

        <div>
          <h2 className={`caps ${panel.h2}`}>{m.health}</h2>
          <p className={styles.note}>{m.healthNote}</p>
          <ul className={styles.health}>
            {CHECKS.map((k) => {
              const n = stats.health[k] ?? 0;
              const [label, why] = m.checks[k];
              return (
                <li key={k} data-state={n === 0 ? "ok" : "look"}>
                  <span className={styles.state}>{n === 0 ? m.ok : m.look}</span>
                  <span className={styles.healthMain}>
                    {label}
                    <span className={styles.why}>{why}</span>
                  </span>
                  <span className={`mono ${styles.count}`}>{n}</span>
                </li>
              );
            })}
          </ul>

          <h2 className={`caps ${panel.h2}`}>{m.accounts}</h2>
          <dl className={styles.facts}>
            <dt>{m.producers}</dt>
            <dd className="mono">{stats.health.producers}</dd>
            <dt>{m.owners}</dt>
            <dd className="mono">{stats.health.owners}</dd>
            <dt>{m.openInvites}</dt>
            <dd className="mono">{stats.counts.open_invites}</dd>
            <dt>{m.comments}</dt>
            <dd className="mono">{stats.counts.comments}</dd>
          </dl>
        </div>
      </div>

      <h2 className={`caps ${panel.h2}`}>{m.panas}</h2>
      <Table
        head={[m.name, m.email, m.projectsCol, m.plays30, m.lastPlay]}
        rows={stats.panas.map((p) => [p.name, <span key="e" className="mono">{p.email}</span>, p.projects, p.plays, when(p.last_play, locale, m.never)])}
        empty={m.noPlays}
      />

      <div className={panel.cols}>
        <div>
          <h2 className={`caps ${panel.h2}`}>{m.recentPlays}</h2>
          {stats.recent_plays.length === 0 ? (
            <p className={panel.muted}>{m.noPlays}</p>
          ) : (
            <ul className={`mono ${panel.log}`}>
              {stats.recent_plays.map((l, i) => (
                <li key={i}>
                  {when(l.at, locale, "")} · {l.email} · {l.catalogue_no} · {l.track}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className={`caps ${panel.h2}`}>{m.recentComments}</h2>
          {stats.recent_comments.length === 0 ? (
            <p className={panel.muted}>{m.noComments}</p>
          ) : (
            <ul className={styles.comments}>
              {stats.recent_comments.map((c, i) => (
                <li key={i}>
                  <p className={`mono ${styles.commentMeta}`}>
                    {c.catalogue_no} · {c.author_name} · {when(c.created_at, locale, "")} · {c.resolved ? m.resolved : m.open}
                  </p>
                  <p>{c.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function Tile({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <li className={styles.tile}>
      <p className={`caps ${styles.tileLabel}`}>{label}</p>
      <p className={styles.tileValue}>{value.toLocaleString()}</p>
      {sub && <p className={`mono ${styles.tileSub}`}>{sub}</p>}
    </li>
  );
}

function Table({ head, rows, empty }: { head: string[]; rows: (string | number | React.ReactNode)[][]; empty: string }) {
  if (rows.length === 0) return <p className={panel.muted}>{empty}</p>;
  return (
    <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={head[0]}>
      <table className={styles.table}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={typeof c === "number" ? styles.num : undefined}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A round axis top: 1, 2, 5, 10, 20, 50 … so the grid lines land on clean numbers. */
function niceMax(v: number) {
  const pow = 10 ** Math.floor(Math.log10(v));
  const f = v / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

/** Plays per day. One series, so no legend: the heading names it. A table view is one click away. */
function DayChart({ days, locale, m }: { days: Day[]; locale: string; m: Dictionary["master"] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [hover, setHover] = useState<number | null>(null);
  // draw at the real pixel width, so the labels are the same size on a phone and on a desktop
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setW(Math.max(260, Math.floor(el.clientWidth - 16)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);
  const H = W < 480 ? 180 : 220;
  const L = 34;
  const T = 10;
  const B = 26;
  const max = niceMax(Math.max(1, ...days.map((d) => d.plays)));
  const slot = (W - L) / days.length;
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const base = y(0);
  const total = days.reduce((s, d) => s + d.plays, 0);

  const bar = (i: number, v: number) => {
    const w = slot - 2; // a 2px gap between bars
    const x = L + i * slot + 1;
    const top = y(v);
    const r = Math.min(4, w / 2, base - top);
    return `M${x} ${base}V${top + r}Q${x} ${top} ${x + r} ${top}H${x + w - r}Q${x + w} ${top} ${x + w} ${top + r}V${base}Z`;
  };

  const active = hover === null ? null : days[hover];
  const side = hover !== null && hover > days.length - 6 ? "right" : hover !== null && hover < 5 ? "left" : "mid";

  return (
    <div className={styles.chart}>
      <div className={styles.chartTools}>
        <button type="button" className={`btn ${panel.small}`} onClick={() => setView(view === "chart" ? "table" : "chart")}>
          {view === "chart" ? m.showTable : m.showChart}
        </button>
      </div>
      {view === "table" ? (
        <Table head={[m.day, m.plays, m.listeners]} rows={[...days].reverse().map((d) => [shortDay(d.day, locale), d.plays, d.listeners])} empty={m.noPlays} />
      ) : (
        <div className={styles.plot} ref={box} onPointerLeave={() => setHover(null)}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${m.activity}: ${total} ${m.plays}`} className={styles.svg}>
            {[0, max / 2, max].map((v) => (
              <g key={v}>
                <line x1={L} x2={W} y1={y(v)} y2={y(v)} className={v === 0 ? styles.axis : styles.grid} />
                <text x={L - 6} y={y(v) + 4} textAnchor="end" className={styles.tick}>
                  {v}
                </text>
              </g>
            ))}
            {days.map((d, i) =>
              d.plays > 0 ? <path key={d.day} d={bar(i, d.plays)} className={hover === i ? styles.barOn : styles.bar} /> : <line key={d.day} x1={L + i * slot + 1} x2={L + (i + 1) * slot - 1} y1={base} y2={base} className={styles.zero} />,
            )}
            {[0, Math.floor(days.length / 2), days.length - 1].map((i) => (
              <text key={i} x={L + (i + 0.5) * slot} y={H - 6} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} className={styles.tick}>
                {shortDay(days[i].day, locale)}
              </text>
            ))}
            {/* each column is a hover and tap target, taller than the bar itself */}
            {days.map((d, i) => (
              <rect key={d.day} x={L + i * slot} y={T} width={slot} height={H - T - B} className={styles.hit} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} />
            ))}
          </svg>
          {active && (
            <div className={styles.tip} data-side={side} style={{ left: `${((L + (hover! + 0.5) * slot) / W) * 100}%` }} role="status">
              <strong>{shortDay(active.day, locale)}</strong>
              <span className="mono">
                {active.plays} {m.plays} · {active.listeners} {m.listeners}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
