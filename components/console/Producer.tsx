"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { canEncode, decodeFile, encode, encrypt, pack, peaks } from "@/lib/audio/codec";
import { clock } from "@/lib/audio/mixState";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Project, Track, TrackKind, Version } from "@/lib/sessions/types";
import { removeFiles, uploadFile } from "@/lib/storage";
import { supabase } from "@/lib/supabase/browser";
import { SignOut } from "./Panels";
import styles from "./Panels.module.css";

type Pana = { id: string; name: string; email: string };
const GROUPS = ["", "drums", "bass", "guitars", "keys", "vox", "fx", "other"] as const;

function db() {
  const sb = supabase();
  if (!sb) throw new Error("Sessions aren't connected yet.");
  return sb;
}

/** Only the producer gets past this. The database enforces it too. */
function useProducer() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    const sb = supabase();
    if (!sb) return setOk(false);
    sb.rpc("is_admin").then(({ data }) => setOk(Boolean(data)));
  }, []);
  return ok;
}

// ── /sessions/admin ───────────────────────────────────────────

export function ProducerHome({ locale, t }: { locale: Locale; t: Dictionary }) {
  const p = t.panel;
  const ok = useProducer();
  const [projects, setProjects] = useState<Project[]>([]);
  const [panas, setPanas] = useState<Pana[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = db();
    const [{ data: pr }, { data: cl }] = await Promise.all([
      sb.from("projects").select("id, catalogue_no, artist, title").order("catalogue_no", { ascending: false }),
      sb.from("clients").select("id, name, email").order("name"),
    ]);
    setProjects(pr ?? []);
    setPanas(cl ?? []);
  }, []);

  useEffect(() => {
    if (ok) load();
  }, [ok, load]);

  const createProject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nums = projects.map((x) => Number(x.catalogue_no.slice(3))).filter(Number.isFinite);
    const catalogue_no = `ec-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0")}`;
    const { data, error } = await db()
      .from("projects")
      .insert({ catalogue_no, artist: String(f.get("artist")).trim(), title: String(f.get("title")).trim() })
      .select("id")
      .single();
    if (error) return setError(error.message);
    await db().from("versions").insert({ project_id: data.id, label: "mix v1", is_current: true });
    location.href = `/${locale}/sessions/admin/${data.id}`;
  };

  const addPana = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const { error } = await db()
      .from("clients")
      .insert({ name: String(f.get("name")).trim(), email: String(f.get("email")).trim().toLowerCase() });
    if (error) return setError(error.message);
    form.reset();
    load();
  };

  if (ok === null) return <p className={styles.narrow}>…</p>;
  if (!ok) return <p className={styles.narrow}>{p.notProducer}</p>;

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
            <button type="submit" className="btn btn-red">
              {p.create}
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
            <button type="submit" className="btn">
              {p.add}
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
  const ok = useProducer();
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [panas, setPanas] = useState<Pana[]>([]);
  const [access, setAccess] = useState<string[]>([]);
  const [listens, setListens] = useState<{ email: string; at: string; name: string }[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = db();
    const [{ data: pr }, { data: vs }, { data: cl }, { data: ac }] = await Promise.all([
      sb.from("projects").select("id, catalogue_no, artist, title").eq("id", id).single(),
      sb.from("versions").select("*").eq("project_id", id).order("created_at"),
      sb.from("clients").select("id, name, email").order("name"),
      sb.from("project_access").select("client_id").eq("project_id", id),
    ]);
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
    if (ok) load();
  }, [ok, load]);
  useEffect(() => {
    if (ok) loadTracks();
  }, [ok, loadTracks]);

  const newVersion = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const label = String(new FormData(form).get("label")).trim();
    const { data, error } = await db().from("versions").insert({ project_id: id, label }).select("id").single();
    if (error) return setError(error.message);
    form.reset();
    setVersionId(data.id);
    load();
  };

  const makeCurrent = async (vid: string) => {
    await db().from("versions").update({ is_current: false }).eq("project_id", id);
    await db().from("versions").update({ is_current: true }).eq("id", vid);
    load();
  };

  const [armed, setArmed] = useState<string | null>(null);
  const removeTrack = async (tr: Track) => {
    if (armed !== tr.id) return setArmed(tr.id);
    await db().from("tracks").delete().eq("id", tr.id);
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
    await db().from("project_access").delete().eq("project_id", id).eq("client_id", clientId);
    load();
  };
  const invite = async (clientId: string) => {
    const { data, error } = await db().from("invites").insert({ client_id: clientId }).select("token").single();
    if (error) return setError(error.message);
    const link = `${location.origin}/${locale}/sessions/join/${data.token}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      prompt(p.inviteLink, link);
    }
    setCopied(clientId);
    setTimeout(() => setCopied(null), 2000);
  };

  if (ok === null) return <p className={styles.narrow}>…</p>;
  if (!ok) return <p className={styles.narrow}>{p.notProducer}</p>;
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
                <button type="button" className={`btn ${styles.small}`} onClick={() => invite(x.id)}>
                  <Icon name="link" float={false} /> {copied === x.id ? p.copied : p.inviteLink}
                </button>
                <button type="button" className={`btn ${styles.small}`} onClick={() => revoke(x.id)}>
                  {p.remove}
                </button>
              </li>
            ))}
          </ul>
          {without.length > 0 && (
            <div className={styles.inline}>
              <select aria-label={p.choosePana} defaultValue="" onChange={(e) => give(e.target.value)}>
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
  const supported = typeof window === "undefined" || canEncode();

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    setItems((x) => [...x, ...[...files].filter((f) => /audio|wav|aiff|flac/i.test(f.type + f.name)).map((file) => ({ file, ...guess(file), step: "queued" as const, pct: 0 }))]);
  };
  const patch = (i: number, p: Partial<Item>) => setItems((x) => x.map((it, k) => (k === i ? { ...it, ...p } : it)));

  const run = async () => {
    setBusy(true);
    const sb = db();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.step === "done") continue;
      try {
        patch(i, { step: "decoding", pct: 0 });
        const pcm = await decodeFile(it.file);
        patch(i, { step: "encoding" });
        const enc = await encode(pcm, (pct) => patch(i, { pct }));
        const wave = peaks(pcm, 800);
        patch(i, { step: "encrypting", pct: 0 });
        const { cipher, key } = await encrypt(pack(enc));
        const trackId = crypto.randomUUID();
        const path = `${projectId}/${versionId}/${trackId}.chorro`;
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
        patch(i, { step: "failed", error: (e as Error).message });
      }
    }
    setBusy(false);
    onDone();
  };

  if (!supported) return <p className={styles.err}>{p.encodeUnsupported}</p>;

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
        <button type="button" className="btn" onClick={() => input.current?.click()}>
          {p.chooseFiles}
        </button>
        <input ref={input} type="file" accept="audio/*,.wav,.aif,.aiff,.flac" multiple hidden onChange={(e) => addFiles(e.target.files)} />
      </div>
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
                  {it.step === "done" && it.ratio && ` · ${p.saved.replace("{pct}", `${Math.round(it.ratio * 100)}%`)}`}
                  {it.error && ` · ${it.error}`}
                </span>
                <span className={styles.bar} aria-hidden="true">
                  <span style={{ transform: `scaleX(${it.step === "done" ? 1 : it.pct})` }} />
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-red" disabled={busy || items.every((x) => x.step === "done")} onClick={run}>
            {p.start} <Icon name="upload" />
          </button>
        </>
      )}
    </div>
  );
}
