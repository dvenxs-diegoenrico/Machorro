"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { canDecode } from "@/lib/audio/codec";
import { Engine, type Mode } from "@/lib/audio/engine";
import { clock, dbLabel, faderToGain } from "@/lib/audio/mixState";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Comment, Project, SessionSource, Track, Version } from "@/lib/sessions/types";
import styles from "./Console.module.css";

type StripState = { pos: number; pan: number; mute: boolean; solo: boolean };
const UNITY = 0.75; // fader position for 0 dB
const IDLE: StripState = { pos: UNITY, pan: 0, mute: false, solo: false };

/** How much decoded audio this device should hold at once (bytes). */
function memoryBudget(): number {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const small = matchMedia("(max-width: 720px)").matches;
  return small || mem <= 4 ? 320e6 : 900e6;
}

/** Decode this many tracks at once: phones run out of memory if every stem decodes together. */
function loadConcurrency(): number {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return matchMedia("(max-width: 720px)").matches || mem <= 4 ? 2 : 4;
}

/** Run `fn` over `items`, `n` at a time. Stops starting new work after the first failure. */
async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  let failed: unknown = null;
  const worker = async () => {
    while (i < items.length && failed === null) {
      const x = items[i++];
      try {
        await fn(x);
      } catch (e) {
        failed = e;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  if (failed !== null) throw failed;
}

/** One quiet retry for a network blip. Access refusals are not retried. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (/too many|no access/i.test((e as Error).message)) throw e;
    await new Promise((r) => setTimeout(r, 700));
    return fn();
  }
}

/**
 * The console: waveform, transport, mixer and comments for one session.
 * Listen only. Audio is decoded into memory inside this page; there is no file to save.
 */
export function Console({ source, projectId, locale, t, demo = false }: { source: SessionSource; projectId: string; locale: Locale; t: Dictionary; demo?: boolean }) {
  const c = t.console;
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null); // the session can't be shown at all
  const [notice, setNotice] = useState<string | null>(null); // something went wrong; the console stays usable
  const [tracksReady, setTracksReady] = useState(false);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [skipped, setSkipped] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [mode, setModeState] = useState<Mode>("stems");
  const [strips, setStrips] = useState<Record<string, StripState>>({});
  const [masterPos, setMasterPos] = useState(UNITY);
  const [loop, setLoopState] = useState<{ start: number; end: number } | null>(null);
  const [draft, setDraft] = useState("");
  const engine = useRef<Engine | null>(null);
  const meters = useRef<Record<string, HTMLSpanElement | null>>({});
  const supported = useMemo(() => (typeof window === "undefined" ? true : canDecode()), []);

  // metadata
  useEffect(() => {
    let live = true;
    source
      .loadProject(projectId)
      .then(({ project, versions, isAdmin }) => {
        if (!live) return;
        setProject(project);
        setVersions(versions);
        setIsAdmin(isAdmin);
        setVersionId((versions.find((v) => v.is_current) ?? versions[versions.length - 1])?.id ?? null);
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [source, projectId]);

  useEffect(() => {
    if (!versionId) return;
    let live = true;
    setTracksReady(false);
    Promise.all([source.loadTracks(versionId), source.loadComments(versionId)])
      .then(([tr, cm]) => {
        if (!live) return;
        setTracks(tr);
        setTracksReady(true);
        setComments(cm);
        setStrips(Object.fromEntries(tr.map((x) => [x.id, { pos: UNITY, pan: 0, mute: false, solo: false }])));
        const kinds = new Set(tr.map((x) => x.kind));
        setModeState(kinds.has("stem") || kinds.has("group") ? "stems" : kinds.has("mix") ? "mix" : "master");
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [source, versionId]);

  // leaving the page, or changing version: drop every buffer
  useEffect(
    () => () => {
      engine.current?.destroy();
      engine.current = null;
    },
    [versionId],
  );

  const stems = tracks.filter((x) => x.kind === "stem" || x.kind === "group");
  const has = { mix: tracks.some((x) => x.kind === "mix"), master: tracks.some((x) => x.kind === "master"), stems: stems.length > 0 };

  /** Load audio (inside the tap that starts it, so iOS allows sound). */
  const open = useCallback(async () => {
    if (!tracks.length) return;
    setNotice(null);
    // a retry must not leave the previous audio context alive: iOS allows only a handful
    await engine.current?.destroy();
    const e = new Engine();
    engine.current = e;
    await e.unlock();
    setPhase("loading");

    // what fits in memory: mix and master always; stems in order (groups first if over budget)
    const bytes = (x: Track) => x.frames * x.channels * 4;
    const singles = tracks.filter((x) => x.kind === "mix" || x.kind === "master");
    let budget = memoryBudget() - singles.reduce((s, x) => s + bytes(x), 0);
    const groups = stems.filter((x) => x.kind === "group");
    const plain = stems.filter((x) => x.kind === "stem");
    const all = plain.reduce((s, x) => s + bytes(x), 0);
    const chosenPool = all > budget && groups.length ? groups : plain.length ? plain : groups;
    const chosen: Track[] = [];
    for (const x of chosenPool) if (budget - bytes(x) > 0 || chosen.length === 0) (chosen.push(x), (budget -= bytes(x)));
    setSkipped(stems.length - chosen.length);
    // the mix first, so there is something to hear even if a stem fails
    const load = [...singles, ...chosen];

    load.forEach((x) => e.add({ id: x.id, kind: x.kind }));
    let last = 0;
    e.onTime((tm) => {
      const now = performance.now();
      if (!e.playing || now - last > 90) {
        last = now;
        setTime(tm);
      }
    });
    e.onLevels((l) => {
      for (const [id, v] of Object.entries(l.tracks)) {
        const m = meters.current[id];
        if (m) m.style.transform = `scaleY(${Math.min(1, v * 1.15).toFixed(3)})`;
      }
      const m = meters.current.__master;
      if (m) m.style.transform = `scaleY(${Math.min(1, l.master * 1.15).toFixed(3)})`;
    });
    e.onInterrupt(() => {
      setPlaying(false);
      setNotice(c.interrupted);
    });
    setProgress({ done: 0, total: load.length });
    try {
      let done = 0;
      await pool(load, loadConcurrency(), async (x) => {
        const buffer = await withRetry(() => source.loadAudio(x, e.ctx));
        if (engine.current !== e) return;
        e.setBuffer(x.id, buffer);
        setProgress({ done: ++done, total: load.length });
      });
      if (engine.current !== e) return;
      e.setMode(mode);
      setPhase("ready");
    } catch (err) {
      if (engine.current !== e) return;
      const m = (err as Error).message;
      setNotice(/too many/i.test(m) ? c.slowDown : /no access/i.test(m) ? c.notFound : c.loadError);
      setPhase("idle");
      engine.current = null;
      void e.destroy();
    }
  }, [tracks, stems, source, mode, c]);

  const toggle = useCallback(async () => {
    const e = engine.current;
    if (!e) return;
    if (e.playing) e.pause();
    else {
      setNotice(null);
      await e.play();
    }
    setPlaying(e.playing);
  }, []);

  const seek = useCallback((s: number) => {
    engine.current?.seek(s);
    setTime(s);
  }, []);

  // stop the playing state when the song ends
  useEffect(() => {
    const e = engine.current;
    if (e && playing && !e.playing) setPlaying(false);
  }, [time, playing]);

  const setMode = (m: Mode) => {
    engine.current?.setMode(m);
    setModeState(m);
  };

  const stripsRef = useRef(strips);
  useEffect(() => {
    stripsRef.current = strips;
  }, [strips]);
  const update = useCallback((id: string, p: Partial<StripState>) => {
    const cur = stripsRef.current[id] ?? { pos: UNITY, pan: 0, mute: false, solo: false };
    const next = { ...cur, ...p };
    const e = engine.current;
    if (e) {
      if (p.pos !== undefined) e.setGain(id, faderToGain(next.pos));
      if (p.pan !== undefined) e.setPan(id, next.pan);
      if (p.mute !== undefined) e.setMute(id, next.mute);
      if (p.solo !== undefined) e.setSolo(id, next.solo);
    }
    stripsRef.current = { ...stripsRef.current, [id]: next };
    setStrips(stripsRef.current);
  }, []);
  const setMeter = useCallback((id: string, el: HTMLSpanElement | null) => {
    meters.current[id] = el;
  }, []);
  const masterChange = useCallback((_: string, p: Partial<StripState>) => {
    if (p.pos === undefined) return;
    setMasterPos(p.pos);
    engine.current?.setMasterGain(faderToGain(p.pos));
  }, []);

  const duration = engine.current?.duration || Math.max(0, ...tracks.map((x) => x.duration));

  // keyboard: space, arrows (strip keys are on the strips)
  useEffect(() => {
    const onKey = (ev: globalThis.KeyboardEvent) => {
      const el = ev.target as HTMLElement;
      if (phase !== "ready" || el.closest("textarea, input, select, [role=slider]")) return;
      if (ev.code === "Space") {
        if (el.closest("button, a, [role=radio]")) return; // Space presses the focused control
        ev.preventDefault();
        toggle();
      } else if (ev.key === "ArrowLeft") seek(Math.max(0, (engine.current?.position ?? 0) - 5));
      else if (ev.key === "ArrowRight") seek(Math.min(duration, (engine.current?.position ?? 0) + 5));
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [phase, toggle, seek, duration]);

  // keep the screen on while playing: a sleeping phone stops the sound
  useEffect(() => {
    if (!playing) return;
    type Lock = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Lock> } };
    if (!nav.wakeLock) return;
    let lock: Lock | null = null;
    let live = true;
    const grab = () =>
      nav
        .wakeLock!.request("screen")
        .then((l) => {
          if (live) lock = l;
          else void l.release();
        })
        .catch(() => undefined);
    grab();
    const again = () => document.visibilityState === "visible" && grab();
    document.addEventListener("visibilitychange", again);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", again);
      lock?.release().catch(() => undefined);
    };
  }, [playing]);

  const post = async () => {
    const body = draft.trim();
    if (!body || !versionId) return;
    const at = engine.current?.position ?? time;
    try {
      const cm = await source.addComment(versionId, at, body);
      setComments((x) => [...x, cm].sort((a, b) => a.time_seconds - b.time_seconds));
      setDraft("");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const resolve = async (cm: Comment) => {
    await source.setResolved(cm.id, !cm.resolved);
    setComments((x) => x.map((y) => (y.id === cm.id ? { ...y, resolved: !cm.resolved } : y)));
  };

  // waveform reference: what's playing now
  const ref = (mode === "master" && tracks.find((x) => x.kind === "master")) || tracks.find((x) => x.kind === "mix") || null;
  const wavePeaks = useMemo(() => {
    if (ref) return ref.peaks;
    const n = Math.max(0, ...stems.map((s) => s.peaks.length));
    return Array.from({ length: n }, (_, i) => Math.min(1, Math.max(0, ...stems.map((s) => s.peaks[i] ?? 0)) * 1.1));
  }, [ref, stems]);

  if (error)
    return (
      <div className={styles.error} role="alert">
        <p>{error}</p>
        <Link href={`/${locale}/sessions`} className="btn">
          {c.back}
        </Link>
      </div>
    );
  if (!project) return <p className={styles.wait}>…</p>;

  return (
    <div className={styles.console} data-theme="night" onContextMenu={(e) => !(e.target as HTMLElement).closest("textarea") && e.preventDefault()}>
      <header className={styles.top}>
        <Link href={`/${locale}/sessions`} className={`caps ${styles.back}`}>
          {c.back}
        </Link>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            {project.title} <span className={styles.artist}>{project.artist}</span>
          </h1>
          <span className={`mono ${styles.cat}`}>{project.catalogue_no}</span>
          <span className={`caps ${styles.lock}`}>
            <Icon name="lock" float={false} /> {c.listenOnly}
          </span>
        </div>
        {versions.length > 1 && (
          <nav className={styles.versions} aria-label={c.versions}>
            {versions.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`btn ${styles.pill}`}
                aria-pressed={v.id === versionId}
                onClick={() => {
                  setPhase("idle");
                  setPlaying(false);
                  setTime(0);
                  setLoopState(null);
                  setSkipped(0);
                  setNotice(null);
                  setVersionId(v.id);
                }}
              >
                {v.label}
              </button>
            ))}
          </nav>
        )}
        {demo && <p className={`mono ${styles.demo}`}>{c.demo}</p>}
      </header>

      <Waveform
        peaks={wavePeaks}
        time={time}
        duration={duration}
        comments={comments}
        loop={loop}
        label={c.seek}
        onSeek={phase === "ready" ? seek : undefined}
        onLoop={(r) => {
          setLoopState(r);
          engine.current?.setLoop(r);
        }}
      />

      <div className={styles.transport}>
        {phase === "ready" ? (
          <button type="button" className={`btn btn-red ${styles.play}`} onClick={toggle} aria-label={playing ? c.pause : c.play}>
            <Icon name={playing ? "pause" : "play"} float={false} />
          </button>
        ) : (
          <button type="button" className={`btn btn-red ${styles.open}`} onClick={open} disabled={!supported || phase === "loading" || !tracksReady || !tracks.length}>
            {phase === "loading" ? c.loading.replace("{n}", String(progress.done)).replace("{t}", String(progress.total)) : notice ? c.retry : c.open}
          </button>
        )}
        <span className={`mono ${styles.clock}`}>
          {clock(time)} / {clock(duration)}
        </span>
        <div className={styles.modes} role="radiogroup" aria-label={c.modeLabel}>
          {(["mix", "stems", "master"] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} disabled={!has[m]} onClick={() => setMode(m)}>
              {c.modes[m]}
            </button>
          ))}
        </div>
        {loop && (
          <button type="button" className={`caps ${styles.clearLoop}`} onClick={() => (setLoopState(null), engine.current?.setLoop(null))}>
            {c.clearLoop} {clock(loop.start)}–{clock(loop.end)}
          </button>
        )}
      </div>
      {!supported && <p className={styles.note}>{c.unsupported}</p>}
      {notice && (
        <p className={`mono ${styles.notice}`} role="alert">
          {notice}
        </p>
      )}
      {phase === "idle" && supported && !notice && tracksReady && <p className={`mono ${styles.note}`}>{c.openNote.replace("{n}", String(tracks.length))}</p>}
      {skipped > 0 && <p className={`mono ${styles.note}`}>{c.memoryNote.replace("{n}", String(stems.length - skipped)).replace("{t}", String(stems.length))}</p>}

      <div className={styles.body}>
        <div className={styles.mixerWrap}>
          <section className={`${styles.mixer} ${mode !== "stems" ? styles.dim : ""}`} aria-label="Mixer" aria-busy={!tracksReady}>
            {stems.map((x) => (
              <ChannelStrip key={x.id} id={x.id} name={x.name} s={strips[x.id] ?? IDLE} t={t} setMeter={setMeter} onChange={update} />
            ))}
            <ChannelStrip id="__master" name={c.master} master s={{ pos: masterPos, pan: 0, mute: false, solo: false }} t={t} setMeter={setMeter} onChange={masterChange} />
          </section>
          {stems.length > 2 && <p className={`mono ${styles.swipe}`}>{c.scrollHint}</p>}
          {!tracksReady && <p className={`mono ${styles.mixerLoading}`}>{c.loading.replace("{n}", "…").replace("{t}", "…")}</p>}
        </div>

        <aside className={styles.comments} aria-label={c.comments}>
          <h2 className={`caps ${styles.h2}`}>{c.comments}</h2>
          <ol className={styles.list}>
            {comments.length === 0 && <li className={styles.empty}>{c.noComments}</li>}
            {comments.map((cm) => (
              <li key={cm.id} className={cm.resolved ? styles.resolved : undefined}>
                <button type="button" className={`mono ${styles.at}`} onClick={() => phase === "ready" && seek(cm.time_seconds)}>
                  {clock(cm.time_seconds)}
                </button>
                <div>
                  <p className={styles.who}>{cm.author_name}</p>
                  <p>{cm.body}</p>
                </div>
                {isAdmin && (
                  <button type="button" className={`caps ${styles.resolve}`} onClick={() => resolve(cm)}>
                    {cm.resolved ? c.reopen : c.resolve}
                  </button>
                )}
              </li>
            ))}
          </ol>
          <form
            className={styles.add}
            onSubmit={(e) => {
              e.preventDefault();
              post();
            }}
          >
            <label htmlFor="comment" className="caps">
              {c.addAt.replace("{t}", clock(time))}
            </label>
            <textarea id="comment" rows={3} maxLength={2000} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={c.placeholder} />
            <button type="submit" className="btn" disabled={!draft.trim()}>
              {c.post}
            </button>
          </form>
        </aside>
      </div>
      <p className={`mono ${styles.keys}`}>{c.keys}</p>
    </div>
  );
}

function Waveform({
  peaks,
  time,
  duration,
  comments,
  loop,
  label,
  onSeek,
  onLoop,
}: {
  peaks: number[];
  time: number;
  duration: number;
  comments: Comment[];
  loop: { start: number; end: number } | null;
  label: string;
  onSeek?: (s: number) => void;
  onLoop: (r: { start: number; end: number } | null) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; t: number } | null>(null);
  const [ghost, setGhost] = useState<{ start: number; end: number } | null>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !peaks.length) return;
    const dpr = devicePixelRatio || 1;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (cv.width !== w * dpr) (cv.width = w * dpr), (cv.height = h * dpr);
    const g = cv.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const css = getComputedStyle(cv);
    const played = duration ? time / duration : 0;
    const bw = w / peaks.length;
    peaks.forEach((p, i) => {
      const x = i * bw;
      const bh = Math.max(1, p * (h - 8));
      g.fillStyle = i / peaks.length < played ? css.getPropertyValue("--played") : css.getPropertyValue("--rest");
      g.fillRect(x, (h - bh) / 2, Math.max(1, bw - 1), bh);
    });
  }, [peaks, time, duration]);

  const at = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((e.clientX - r.left) / r.width) * duration));
  };
  const range = loop ?? ghost;

  return (
    <div
      className={styles.wave}
      onPointerDown={(e) => {
        if (!onSeek) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, t: at(e) };
      }}
      onPointerMove={(e) => {
        if (!drag.current || Math.abs(e.clientX - drag.current.x) < 6) return;
        const t = at(e);
        setGhost({ start: Math.min(t, drag.current.t), end: Math.max(t, drag.current.t) });
      }}
      onPointerCancel={() => {
        drag.current = null;
        setGhost(null);
      }}
      onPointerUp={(e) => {
        if (!drag.current || !onSeek) return;
        const moved = Math.abs(e.clientX - drag.current.x) >= 6;
        if (moved && ghost) onLoop(ghost);
        else onSeek(at(e));
        drag.current = null;
        setGhost(null);
      }}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(time)}
      aria-valuetext={`${clock(time)} / ${clock(duration)}`}
      onKeyDown={(e) => {
        if (!onSeek) return;
        if (e.key === "ArrowLeft") (e.preventDefault(), onSeek(Math.max(0, time - 5)));
        if (e.key === "ArrowRight") (e.preventDefault(), onSeek(Math.min(duration, time + 5)));
      }}
    >
      <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
      {range && duration > 0 && (
        <span className={styles.loop} style={{ left: `${(range.start / duration) * 100}%`, width: `${((range.end - range.start) / duration) * 100}%` }} />
      )}
      {duration > 0 && <span className={styles.head} style={{ left: `${(time / duration) * 100}%` }} />}
      {duration > 0 &&
        comments.map((cm) => (
          <span
            key={cm.id}
            className={`${styles.marker} ${cm.resolved ? styles.markerDone : ""}`}
            style={{ left: `${(cm.time_seconds / duration) * 100}%` } as CSSProperties}
            title={`${clock(cm.time_seconds)} ${cm.author_name}: ${cm.body}`}
          />
        ))}
    </div>
  );
}

const ChannelStrip = memo(function ChannelStrip({
  id,
  name,
  s,
  t,
  master = false,
  setMeter,
  onChange,
}: {
  id: string;
  name: string;
  s: StripState;
  t: Dictionary;
  master?: boolean;
  setMeter: (id: string, el: HTMLSpanElement | null) => void;
  onChange: (id: string, p: Partial<StripState>) => void;
}) {
  const c = t.console;
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("input, [role=slider]")) return;
    if (master) return;
    if (e.key === "m" || e.key === "M") onChange(id, { mute: !s.mute });
    if (e.key === "s" || e.key === "S") onChange(id, { solo: !s.solo });
  };
  return (
    <div className={`${styles.strip} ${master ? styles.masterStrip : ""}`} tabIndex={0} onKeyDown={onKey} aria-label={name}>
      <p className={styles.stripName} title={name}>
        {name}
      </p>
      {!master ? <Knob value={s.pan} label={`${c.pan} ${name}`} reset={c.resetPan} onChange={(pan) => onChange(id, { pan })} /> : <span className={styles.knobSpace} />}
      {!master && (
        <div className={styles.ms}>
          <button type="button" className={styles.m} aria-pressed={s.mute} aria-label={`${c.mute} ${name}`} onClick={() => onChange(id, { mute: !s.mute })}>
            M
          </button>
          <button type="button" className={styles.s} aria-pressed={s.solo} aria-label={`${c.solo} ${name}`} onClick={() => onChange(id, { solo: !s.solo })}>
            S
          </button>
        </div>
      )}
      <div className={styles.faderRow}>
        <input
          type="range"
          className={styles.fader}
          min={0}
          max={1}
          step={0.005}
          value={s.pos}
          aria-label={`${name} level`}
          aria-valuetext={`${dbLabel(faderToGain(s.pos))} dB`}
          onChange={(e) => onChange(id, { pos: Number(e.target.value) })}
          onDoubleClick={() => onChange(id, { pos: UNITY })}
        />
        <span className={styles.meter} aria-hidden="true">
          <span ref={(el) => setMeter(id, el)} />
        </span>
      </div>
      {/* tapping the level resets it: double-click does not exist on a phone */}
      <button type="button" className={`mono ${styles.db}`} onClick={() => onChange(id, { pos: UNITY })} title={c.resetLevel} aria-label={`${c.resetLevel}: ${name}`}>
        {dbLabel(faderToGain(s.pos))}
      </button>
    </div>
  );
});

/** A pan knob: drag up/down or use the arrow keys. Double-click or double-tap centres it. */
function Knob({ value, label, reset, onChange }: { value: number; label: string; reset: string; onChange: (v: number) => void }) {
  const start = useRef<{ y: number; v: number; moved: boolean } | null>(null);
  const lastTap = useRef(0);
  const set = (v: number) => onChange(Math.round(Math.max(-1, Math.min(1, v)) * 100) / 100);
  const text = value === 0 ? "C" : value < 0 ? `L${Math.round(-value * 100)}` : `R${Math.round(value * 100)}`;
  return (
    <div
      className={styles.knob}
      role="slider"
      tabIndex={0}
      aria-label={label}
      title={reset}
      aria-valuemin={-100}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      aria-valuetext={text}
      style={{ "--rot": `${value * 135}deg` } as CSSProperties}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { y: e.clientY, v: value, moved: false };
      }}
      onPointerMove={(e) => {
        const st = start.current;
        if (!st) return;
        if (Math.abs(st.y - e.clientY) > 4) st.moved = true;
        if (st.moved) set(st.v + (st.y - e.clientY) / 80);
      }}
      onPointerUp={() => {
        const st = start.current;
        start.current = null;
        if (!st || st.moved) return;
        const now = performance.now();
        if (now - lastTap.current < 320) set(0); // a quick second tap centres it
        lastTap.current = now;
      }}
      onPointerCancel={() => (start.current = null)}
      onDoubleClick={() => set(0)}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowRight") (e.preventDefault(), set(value + 0.05));
        if (e.key === "ArrowDown" || e.key === "ArrowLeft") (e.preventDefault(), set(value - 0.05));
      }}
    >
      <span className={styles.knobFace} />
      <span className={`mono ${styles.knobText}`}>{text}</span>
    </div>
  );
}
