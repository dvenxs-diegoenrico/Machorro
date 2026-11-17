"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { canEncode, decodeFile, encode, encrypt, isCompressed, keepAsIs, pack, peaks } from "@/lib/audio/codec";
import { clock } from "@/lib/audio/mixState";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Project, Track, TrackKind, Version } from "@/lib/sessions/types";
import { removeFiles, uploadFile } from "@/lib/storage";
import { supabase } from "@/lib/supabase/browser";
import { Login, SignOut } from "./Panels";
import styles from "./Panels.module.css";

type Pana = { id: string; name: string; email: string };
const GROUPS = ["", "drums", "bass", "guitars", "keys", "vox", "fx", "other"] as const;

function db() {
  const sb = supabase();
  if (!sb) throw new Error("Sessions aren't connected yet.");
  return sb;
}

type Who = "loading" | "out" | "other" | "producer";

/** Only the producer gets past this. The database enforces it too. */
function useProducer(): Who {
  const [who, setWho] = useState<Who>("loading");
  useEffect(() => {
    const sb = supabase();
    if (!sb) return setWho("other");
    (async () => {
      const { data: u } = await sb.auth.getUser();
      if (!u.user) return setWho("out");
      const { data } = await sb.rpc("is_admin");
      setWho(data ? "producer" : "other");
    })();
  }, []);
  return who;
}

/** What a visitor sees instead of the panel: a sign-in if signed out, a clear message otherwise. */
function Gate({ who, locale, t }: { who: Who; locale: Locale; t: Dictionary }) {
  const p = t.panel;
  if (who === "loading") return <p className={styles.narrow}>…</p>;
  if (who === "out") return <Login locale={locale} t={t} note={p.signInFirst} next="admin" />;
  return (
    <section className={styles.narrow}>
      <h1 className={styles.h1}>{t.console.label}</h1>
      <p className={styles.lead}>{`${p.notProducer} ${p.wrongAccount}`}</p>
      <div className={styles.actions}>
        <Link href={`/${locale}/sessions`} className="btn">
          {t.console.back}
        </Link>
        <SignOut locale={locale} t={t} />
      </div>
    </section>
  );
}

// ── /sessions/admin ───────────────────────────────────────────

export function ProducerHome({ locale, t }: { locale: Locale; t: Dictionary }) {
  const p = t.panel;
  const who = useProducer();
  const [projects, setProjects] = useState<Project[]>([]);
  const [panas, setPanas] = useState<Pana[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"project" | "pana" | null>(null);

  const load = useCallback(async () => {
    const sb = db();
    const [{ data: pr, error: e1 }, { data: cl, error: e2 }] = await Promise.all([
      sb.from("projects").select("id, catalogue_no, artist, title").order("catalogue_no", { ascending: false }),
      sb.from("clients").select("id, name, email").order("name"),
    ]);
    if (e1 || e2) setError((e1 ?? e2)!.message);
    setProjects(pr ?? []);
    setPanas(cl ?? []);
  }, []);

  useEffect(() => {
    if (who === "producer") load();
  }, [who, load]);

  const createProject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return; // a double tap must not make two projects
    const f = new FormData(e.currentTarget);
    setBusy("project");
    setError(null);
    // the next free catalogue number, read fresh so a second device can't collide with this one
    const { data: latest } = await db().from("projects").select("catalogue_no").order("catalogue_no", { ascending: false }).limit(1);
    const last = Number(latest?.[0]?.catalogue_no.slice(3));
    const catalogue_no = `ec-${String((Number.isFinite(last) ? last : 0) + 1).padStart(3, "0")}`;
    const { data, error } = await db()
      .from("projects")
      .insert({ catalogue_no, artist: String(f.get("artist")).trim(), title: String(f.get("title")).trim() })
      .select("id")
      .single();
    if (error || !data) {
      setBusy(null);
      return setError(error?.message ?? "");
    }
    const { error: ve } = await db().from("versions").insert({ project_id: data.id, label: "mix v1", is_current: true });
    if (ve) {
      await db().from("projects").delete().eq("id", data.id); // no half-made project
      setBusy(null);
      return setError(ve.message);
    }
    location.href = `/${locale}/sessions/admin/${data.id}`;
  };

  const addPana = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy("pana");
    setError(null);
    const { error } = await db()
      .from("clients")
      .insert({ name: String(f.get("name")).trim(), email: String(f.get("email")).trim().toLowerCase() });
    setBusy(null);
    if (error) return setError(error.code === "23505" ? `${String(f.get("email"))}: ${p.panaExists}` : error.message);
    form.reset();
    load();
  };

  if (who !== "producer") return <Gate who={who} locale={locale} t={t} />;

  return (
    <section className={styles.wide}>
      <div className={styles.headRow}>
        <h1 className={styles.h1}>{p.producer}</h1>
        <div className={styles.actions}>
          <Link href={`/${locale}/sessions`} className="btn">
            {t.console.back}
          </Link>
          <SignOut locale={locale} t={t} />
        </div>
      </div>
      {error && <p className={styles.err} role="alert">{error}</p>}

      <div className={styles.cols}>
        <div>
          <h2 className={`caps ${styles.h2}`}>{p.projects}</h2>
          <ul className={styles.rows}>
            {projects.map((pr) => (
              <li key={pr.id}>
                <span className={`mono ${styles.cat}`}>{pr.catalogue_no}</span>
                <span className={styles.rowMain}>
                  {pr.title} <span className={styles.muted}>{pr.artist}</span>
                </span>
                <Link href={`/${locale}/sessions/admin/${pr.id}`} className="btn">
                  {p.manage}
                </Link>
              </li>
            ))}
          </ul>
          <form className={styles.inline} onSubmit={createProject}>
            <h3 className={`caps ${styles.h3}`}>{p.newProject}</h3>
            <input name="artist" required placeholder={p.artist} aria-label={p.artist} maxLength={120} />
            <input name="title" required placeholder={p.title} aria-label={p.title} maxLength={160} />
            <button type="submit" className="btn btn-red" disabled={busy === "project"}>
              {busy === "project" ? p.working : p.create}
            </button>
          </form>
        </div>

        <div>
          <h2 className={`caps ${styles.h2}`}>{p.panas}</h2>
          <ul className={styles.rows}>
            {panas.map((x) => (
              <li key={x.id}>
                <span className={styles.rowMain}>
                  {x.name} <span className={`mono ${styles.muted}`}>{x.email}</span>
                </span>
              </li>
            ))}
          </ul>
          <form className={styles.inline} onSubmit={addPana}>
            <h3 className={`caps ${styles.h3}`}>{p.addPana}</h3>
            <input name="name" required placeholder={p.name} aria-label={p.name} maxLength={120} />
            <input name="email" type="email" required placeholder={p.email} aria-label={p.email} />
            <button type="submit" className="btn" disabled={busy === "pana"}>
              {busy === "pana" ? p.working : p.add}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

// ── /sessions/admin/[id] ──────────────────────────────────────

export function ProjectAdmin({ id, locale, t }: { id: string; locale: Locale; t: Dictionary }) {
  const p = t.panel;
  const who = useProducer();
  const [project, setProject] = useState<Project | null>(null);
  const [missing, setMissing] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [panas, setPanas] = useState<Pana[]>([]);
  const [access, setAccess] = useState<string[]>([]);
  const [listens, setListens] = useState<{ email: string; at: string; name: string }[]>([]);
  const [invited, setInvited] = useState<{ clientId: string; name: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = db();
    const [{ data: pr }, { data: vs }, { data: cl }, { data: ac }] = await Promise.all([
      sb.from("projects").select("id, catalogue_no, artist, title").eq("id", id).maybeSingle(),
      sb.from("versions").select("*").eq("project_id", id).order("created_at"),
      sb.from("clients").select("id, name, email").order("name"),
      sb.from("project_access").select("client_id").eq("project_id", id),
    ]);
    if (!pr) return setMissing(true);
    setProject(pr);
    setVersions(vs ?? []);
    setPanas(cl ?? []);
    setAccess((ac ?? []).map((a) => a.client_id));
    setVersionId((v) => v ?? (vs ?? []).find((x) => x.is_current)?.id ?? (vs ?? []).at(-1)?.id ?? null);
    const { data: ls } = await sb
      .from("listens")
      .select("email, at, tracks!inner(name, versions!inner(project_id))")
      .eq("tracks.versions.project_id", id)
      .order("at", { ascending: false })
      .limit(25);
    setListens(((ls ?? []) as unknown as { email: string; at: string; tracks: { name: string } }[]).map((l) => ({ email: l.email, at: l.at, name: l.tracks.name })));
  }, [id]);

  const loadTracks = useCallback(async () => {
    if (!versionId) return setTracks([]);
    const { data } = await db().from("tracks").select("*").eq("version_id", versionId).order("sort");
    setTracks((data ?? []) as Track[]);
  }, [versionId]);

  useEffect(() => {
    if (who === "producer") load();
  }, [who, load]);
  useEffect(() => {
    if (who === "producer") loadTracks();
  }, [who, loadTracks]);

  const newVersion = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const label = String(new FormData(form).get("label")).trim();
    const { data, error } = await db().from("versions").insert({ project_id: id, label }).select("id").single();
    if (error || !data) return setError(error?.message ?? "");
    form.reset();
    setVersionId(data.id);
    load();
  };

  const makeCurrent = async (vid: string) => {
    const a = await db().from("versions").update({ is_current: false }).eq("project_id", id);
    const b = a.error ? a : await db().from("versions").update({ is_current: true }).eq("id", vid);
    if (b.error) setError(b.error.message);
    load();
  };

  // two-step delete: the first tap arms the button, and it disarms itself if you walk away
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(null), 4000);
    return () => clearTimeout(timer);
  }, [armed]);
  const removeTrack = async (tr: Track) => {
    if (armed !== tr.id) return setArmed(tr.id);
    const { error } = await db().from("tracks").delete().eq("id", tr.id);
    if (error) return setError(error.message);
    await removeFiles([tr.stream_path]);
    setArmed(null);
    loadTracks();
  };

  const give = async (clientId: string) => {
    if (!clientId) return;
    const { error } = await db().from("project_access").insert({ project_id: id, client_id: clientId });
    if (error) setError(error.message);
    load();
  };
  const revoke = async (clientId: string) => {
    const { error } = await db().from("project_access").delete().eq("project_id", id).eq("client_id", clientId);
    if (error) setError(error.message);
    if (invited?.clientId === clientId) setInvited(null);
    load();
  };
  // The link is shown in a field you can tap and copy. Auto-copy is a bonus: iOS refuses it
  // once a network call has happened since the tap, so the field is what always works.
  const invite = async (x: Pana) => {
    const { data, error } = await db().from("invites").insert({ client_id: x.id }).select("token").single();
    if (error || !data) return setError(error?.message ?? "");
    const url = `${location.origin}/${locale}/sessions/join/${data.token}`;
    setInvited({ clientId: x.id, name: x.name, url });
    navigator.clipboard?.writeText(url).catch(() => undefined);
  };

  if (who !== "producer") return <Gate who={who} locale={locale} t={t} />;
  if (missing) {
    return (
      <section className={styles.narrow}>
        <p className={styles.lead}>{p.projectMissing}</p>
        <Link href={`/${locale}/sessions/admin`} className="btn">
          {p.producer}
        </Link>
      </section>
    );
  }
  if (!project) return <p className={styles.narrow}>…</p>;

  const withAccess = panas.filter((x) => access.includes(x.id));
  const without = panas.filter((x) => !access.includes(x.id));

  return (
    <section className={styles.wide}>
      <Link href={`/${locale}/sessions/admin`} className={`caps ${styles.backLink}`}>
        {p.producer}
      </Link>
      <div className={styles.headRow}>
        <h1 className={styles.h1}>
          {project.title} <span className={styles.muted}>{project.artist}</span>
        </h1>
        <span className={`mono ${styles.cat}`}>{project.catalogue_no}</span>
        <Link href={`/${locale}/sessions/p/${id}`} className="btn btn-red">
          {p.preview} <Icon name="arrow-right" />
        </Link>
      </div>
      {error && <p className={styles.err} role="alert">{error}</p>}

      <div className={styles.cols}>
        <div>
          <h2 className={`caps ${styles.h2}`}>{p.versions}</h2>
          <div className={styles.pills}>
            {versions.map((v) => (
              <button key={v.id} type="button" className="btn" aria-pressed={v.id === versionId} onClick={() => setVersionId(v.id)}>
                {v.label}
                {v.is_current && <span className={`mono ${styles.tag}`}>{p.current}</span>}
              </button>
            ))}
          </div>
          <form className={styles.inline} onSubmit={newVersion}>
            <input name="label" required placeholder={p.versionLabel} aria-label={p.newVersion} maxLength={60} />
            <button type="submit" className="btn">
              {p.newVersion}
            </button>
            {versionId && !versions.find((v) => v.id === versionId)?.is_current && (
              <button type="button" className="btn" onClick={() => makeCurrent(versionId)}>
                {p.makeCurrent}
              </button>
            )}
          </form>

          <h2 className={`caps ${styles.h2}`}>{p.tracks}</h2>
          {tracks.length === 0 ? (
            <p className={styles.muted}>{p.noTracks}</p>
          ) : (
            <ul className={styles.rows}>
              {tracks.map((tr) => (
                <li key={tr.id}>
                  <span className={`mono ${styles.tag}`}>{p.kinds[tr.kind]}</span>
                  <span className={styles.rowMain}>
                    {tr.name} {tr.grp && <span className={`mono ${styles.muted}`}>{tr.grp}</span>}
                  </span>
                  <span className={`mono ${styles.muted}`}>{clock(tr.duration)}</span>
                  <button type="button" className={`btn ${styles.small}`} onClick={() => removeTrack(tr)}>
                    {armed === tr.id ? p.deleteConfirm : p.remove}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {versionId && <Uploader projectId={id} versionId={versionId} start={tracks.length} t={t} onDone={loadTracks} />}
        </div>

        <div>
          <h2 className={`caps ${styles.h2}`}>{p.access}</h2>
          {withAccess.length === 0 && <p className={styles.muted}>{p.noAccess}</p>}
          <ul className={styles.rows}>
            {withAccess.map((x) => (
              <li key={x.id}>
                <span className={styles.rowMain}>
                  {x.name} <span className={`mono ${styles.muted}`}>{x.email}</span>
                </span>
                <button type="button" className={`btn ${styles.small}`} onClick={() => invite(x)}>
                  <Icon name="link" float={false} /> {p.inviteLink}
                </button>
                <button type="button" className={`btn ${styles.small}`} onClick={() => revoke(x.id)}>
                  {p.remove}
                </button>
              </li>
            ))}
          </ul>
          {invited && (
            <div className={styles.invite} role="status">
              <label htmlFor="invite-url">{p.inviteReady.replace("{name}", invited.name)}</label>
              <div className={styles.inviteRow}>
                <input id="invite-url" readOnly value={invited.url} onFocus={(e) => e.currentTarget.select()} />
                <button
                  type="button"
                  className="btn"
                  onClick={() => navigator.clipboard?.writeText(invited.url).then(() => setError(null), () => document.getElementById("invite-url")?.focus())}
                >
                  {p.copyThis}
                </button>
              </div>
            </div>
          )}
          {without.length > 0 && (
            <div className={styles.inline}>
              <select key={without.length} aria-label={p.choosePana} defaultValue="" onChange={(e) => give(e.target.value)}>
                <option value="" disabled>
                  {p.choosePana}
                </option>
                {without.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} · {x.email}
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className={styles.muted}>
            <Link href={`/${locale}/sessions/admin`}>{p.addPana}</Link>
          </p>

          <h2 className={`caps ${styles.h2}`}>{p.listens}</h2>
          {listens.length === 0 ? (
            <p className={styles.muted}>{p.noListens}</p>
          ) : (
            <ul className={`mono ${styles.log}`}>
              {listens.map((l, i) => (
                <li key={i}>
                  {new Date(l.at).toLocaleString(locale)} · {l.email} · {l.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

// ── the uploader: WAV → compressed → encrypted → storage ─────

type Item = { file: File; name: string; kind: TrackKind; grp: string; step: keyof Dictionary["panel"]["steps"]; pct: number; ratio?: number; error?: string };

function guess(file: File): Pick<Item, "name" | "kind" | "grp"> {
  const base = file.name.replace(/\.[^.]+$/, "");
  const n = base.toLowerCase();
  const kind: TrackKind = /master/.test(n) ? "master" : /\bmix\b|bounce|full/.test(n) ? "mix" : "stem";
  const grp = /kick|snare|drum|hat|tom|perc|overhead/.test(n)
    ? "drums"
    : /bass/.test(n)
      ? "bass"
      : /gtr|guitar|guit/.test(n)
        ? "guitars"
        : /key|piano|synth|organ|pad|rhodes/.test(n)
          ? "keys"
          : /vox|vocal|voz|bv|choir|lead/.test(n)
            ? "vox"
            : /fx|sfx|riser/.test(n)
              ? "fx"
              : "";
  return { name: base.replace(/[_-]+/g, " ").trim(), kind, grp: kind === "stem" ? grp : "" };
}

function Uploader({ projectId, versionId, start, t, onDone }: { projectId: string; versionId: string; start: number; t: Dictionary; onDone: () => void }) {
  const p = t.panel;
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [skipped, setSkipped] = useState(0);
  // WAV needs the browser's encoder; MP3/AAC are kept as they are and don't
  const canCompress = typeof window === "undefined" || canEncode();

  // a long upload must survive a locked screen and a stray tab close
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    type Lock = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Lock> } };
    let lock: Lock | null = null;
    let live = true;
    nav.wakeLock?.request("screen").then((l) => (live ? (lock = l) : void l.release()), () => undefined);
    return () => {
      live = false;
      removeEventListener("beforeunload", warn);
      lock?.release().catch(() => undefined);
    };
  }, [busy]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const all = [...files];
    const audio = all.filter((f) => /audio|wav|aiff?|flac|mp3|m4a|aac|ogg|opus/i.test(f.type + f.name));
    setSkipped(all.length - audio.length);
    setItems((x) => {
      const same = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
      const fresh = audio.filter((f) => !x.some((it) => same(it.file, f)));
      return [...x, ...fresh.map((file) => ({ file, ...guess(file), step: "queued" as const, pct: 0 }))];
    });
    if (input.current) input.current.value = ""; // choosing the same file again must work
  };
  const patch = (i: number, p: Partial<Item>) => setItems((x) => x.map((it, k) => (k === i ? { ...it, ...p } : it)));

  const run = async () => {
    setBusy(true);
    const sb = db();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.step === "done") continue;
      let path = "";
      let trackId = "";
      try {
        if (!isCompressed(it.file) && !canCompress) throw new Error(p.noEncoder);
        patch(i, { step: "decoding", pct: 0, error: undefined });
        const pcm = await decodeFile(it.file);
        patch(i, { step: "encoding" });
        // MP3 and other compressed files are kept as they are; WAV/AIFF/FLAC get compressed
        const enc = isCompressed(it.file) ? await keepAsIs(it.file, pcm) : await encode(pcm, (pct) => patch(i, { pct }));
        const wave = peaks(pcm, 800);
        patch(i, { step: "encrypting", pct: 0 });
        const { cipher, key } = await encrypt(pack(enc));
        if (cipher.length > 95e6) throw new Error(p.tooBig); // the storage bucket stops at 100 MB
        trackId = crypto.randomUUID();
        path = `${projectId}/${versionId}/${trackId}.chorro`;
        patch(i, { step: "uploading", pct: 0, ratio: cipher.length / it.file.size });
        await uploadFile(path, cipher, (pct) => patch(i, { pct }));
        const { error: e1 } = await sb.from("tracks").insert({
          id: trackId,
          version_id: versionId,
          name: it.name || it.file.name,
          kind: it.kind,
          grp: it.grp,
          sort: start + i,
          stream_path: path,
          codec: enc.header.codec,
          sample_rate: enc.header.sampleRate,
          channels: enc.header.channels,
          frames: enc.header.frames,
          duration: pcm.duration,
          size_bytes: cipher.length,
          peaks: wave,
        });
        if (e1) throw new Error(e1.message);
        const { error: e2 } = await sb.from("track_keys").insert({ track_id: trackId, key });
        if (e2) throw new Error(e2.message);
        patch(i, { step: "done", pct: 1 });
      } catch (e) {
        // leave nothing behind: a file with no track row, or a track with no key, can't be played
        if (trackId) await sb.from("tracks").delete().eq("id", trackId);
        if (path) await removeFiles([path]).catch(() => undefined);
        patch(i, { step: "failed", error: path ? `${p.rollback} (${(e as Error).message})` : (e as Error).message });
      }
    }
    setBusy(false);
    onDone();
  };

  return (
    <div className={styles.upload}>
      <h2 className={`caps ${styles.h2}`}>{p.upload}</h2>
      <div
        className={`${styles.drop} ${over ? styles.dropOver : ""}`}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <Icon name="upload" />
        <p>{p.uploadHint}</p>
        <button type="button" className="btn" onClick={() => input.current?.click()} disabled={busy}>
          {p.chooseFiles}
        </button>
        <input ref={input} type="file" accept="audio/*,.wav,.aif,.aiff,.flac,.mp3,.m4a,.aac,.ogg,.opus" multiple hidden onChange={(e) => addFiles(e.target.files)} />
      </div>
      {!canCompress && <p className={styles.err}>{p.noEncoder}</p>}
      {skipped > 0 && <p className={styles.muted}>{p.skippedFiles.replace("{n}", String(skipped))}</p>}
      {items.length > 0 && (
        <>
          <ul className={styles.queue}>
            {items.map((it, i) => (
              <li key={i}>
                <input value={it.name} aria-label={p.name} disabled={busy || it.step === "done"} onChange={(e) => patch(i, { name: e.target.value })} />
                <select value={it.kind} aria-label={p.kind} disabled={busy || it.step === "done"} onChange={(e) => patch(i, { kind: e.target.value as TrackKind })}>
                  {(["stem", "group", "mix", "master"] as const).map((k) => (
                    <option key={k} value={k}>
                      {p.kinds[k]}
                    </option>
                  ))}
                </select>
                <select value={it.grp} aria-label={p.group} disabled={busy || it.step === "done" || it.kind === "mix" || it.kind === "master"} onChange={(e) => patch(i, { grp: e.target.value })}>
                  {GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g || "—"}
                    </option>
                  ))}
                </select>
                <span className={`mono ${styles.step} ${it.step === "failed" ? styles.errText : ""}`}>
                  {p.steps[it.step]}
                  {(it.step === "encoding" || it.step === "uploading") && ` ${Math.round(it.pct * 100)}%`}
                  {it.step === "done" && it.ratio !== undefined && it.ratio < 0.97 && ` · ${p.saved.replace("{pct}", `${Math.round((1 - it.ratio) * 100)}%`)}`}
                  {it.error && ` · ${it.error}`}
                  {it.step !== "done" && !busy && (
                    <button type="button" className={styles.drop2} onClick={() => setItems((x) => x.filter((_, k) => k !== i))} aria-label={`${p.removeFile}: ${it.name}`}>
                      <Icon name="close" float={false} />
                    </button>
                  )}
                </span>
                <span className={styles.bar} aria-hidden="true">
                  <span style={{ transform: `scaleX(${it.step === "done" ? 1 : it.pct})` }} />
                </span>
              </li>
            ))}
          </ul>
          <div className={styles.actions2}>
            <button type="button" className="btn btn-red" disabled={busy || items.every((x) => x.step === "done")} onClick={run}>
              {busy ? p.working : p.start} <Icon name="upload" />
            </button>
            {items.some((x) => x.step === "done") && !busy && (
              <button type="button" className="btn" onClick={() => setItems((x) => x.filter((it) => it.step !== "done"))}>
                {p.clearDone}
              </button>
            )}
          </div>
          {busy && <p className={styles.muted}>{p.keepOpen}</p>}
        </>
      )}
    </div>
  );
}
