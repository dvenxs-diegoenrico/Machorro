"use client";

/**
 * A demo session generated in the browser: no account, no network. It shows how the console
 * works before Supabase is connected. Six stems, a mix and a master of a 32-bar groove.
 */
import { peaks } from "@/lib/audio/codec";
import type { Comment, SessionSource, Track } from "./types";

const BPM = 96;
const BEAT = 60 / BPM;
const BARS = 16;
const SECONDS = BARS * 4 * BEAT; // 40 s
const RATE = 48000;

type Part = { id: string; name: string; grp: string; kind: Track["kind"]; channels: number };
const PARTS: Part[] = [
  { id: "drums", name: "Drums", grp: "drums", kind: "stem", channels: 2 },
  { id: "bass", name: "Bass", grp: "bass", kind: "stem", channels: 1 },
  { id: "gtr", name: "Guitar", grp: "guitars", kind: "stem", channels: 2 },
  { id: "keys", name: "Keys", grp: "keys", kind: "stem", channels: 2 },
  { id: "vox", name: "Vocal", grp: "vox", kind: "stem", channels: 1 },
  { id: "bv", name: "Backing vox", grp: "vox", kind: "stem", channels: 2 },
  { id: "mix", name: "Mix", grp: "", kind: "mix", channels: 2 },
  { id: "master", name: "Master", grp: "", kind: "master", channels: 2 },
];

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
// Cmaj9 → F#m7(b5) → E7(b9) → Am9, the chords on the site's strings
const CHORDS = [
  [48, 52, 55, 59, 62],
  [42, 45, 48, 52, 57],
  [40, 44, 47, 50, 53],
  [45, 48, 52, 55, 59],
];

function note(ctx: OfflineAudioContext, out: AudioNode, freq: number, t: number, len: number, type: OscillatorType, vol: number, pan = 0) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const p = ctx.createStereoPanner();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0005, t + len);
  p.pan.value = pan;
  o.connect(g).connect(p).connect(out);
  o.start(t);
  o.stop(t + len + 0.05);
}

function noise(ctx: OfflineAudioContext, out: AudioNode, t: number, len: number, vol: number, hp: number, pan = 0) {
  const b = ctx.createBuffer(1, Math.ceil(RATE * len), RATE);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource();
  s.buffer = b;
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + len);
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  s.connect(f).connect(g).connect(p).connect(out);
  s.start(t);
}

function write(id: string, ctx: OfflineAudioContext, out: AudioNode) {
  for (let bar = 0; bar < BARS; bar++) {
    const t0 = bar * 4 * BEAT;
    const chord = CHORDS[bar % 4];
    if (id === "drums") {
      for (let b = 0; b < 4; b++) {
        const t = t0 + b * BEAT;
        if (b % 2 === 0) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.setValueAtTime(120, t);
          o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
          g.gain.setValueAtTime(0.9, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          o.connect(g).connect(out);
          o.start(t);
          o.stop(t + 0.35);
        } else noise(ctx, out, t, 0.18, 0.5, 1800);
        for (let h = 0; h < 2; h++) noise(ctx, out, t + h * BEAT * 0.5, 0.05, 0.18, 8000, 0.35);
      }
    }
    if (id === "bass") {
      [0, 1.5, 2, 3].forEach((b, k) => note(ctx, out, hz(chord[0] - 12 + (k === 2 ? 7 : 0)), t0 + b * BEAT, BEAT * 0.9, "triangle", 0.5));
    }
    if (id === "gtr") {
      [0.5, 1.5, 2.5, 3.5].forEach((b) => chord.slice(1).forEach((m, k) => note(ctx, out, hz(m + 12), t0 + b * BEAT + k * 0.012, 0.35, "sawtooth", 0.05, -0.45)));
    }
    if (id === "keys") {
      chord.forEach((m) => note(ctx, out, hz(m + 12), t0, 4 * BEAT, "sine", 0.07, 0.4));
    }
    if (id === "vox" && bar % 2 === 0) {
      [0, 1, 2, 2.5].forEach((b, k) => note(ctx, out, hz(chord[(k + 2) % 5] + 24), t0 + b * BEAT, BEAT * 0.9, "triangle", 0.22));
    }
    if (id === "bv" && bar % 4 === 3) {
      [chord[1], chord[3]].forEach((m, k) => note(ctx, out, hz(m + 24), t0, 4 * BEAT, "sine", 0.06, k ? 0.6 : -0.6));
    }
  }
}

async function render(part: Part): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(SECONDS * RATE), RATE);
  if (part.kind === "stem") write(part.id, ctx, ctx.destination);
  else {
    const bus = ctx.createGain();
    bus.gain.value = part.kind === "master" ? 0.95 : 0.7;
    if (part.kind === "master") {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3;
      bus.connect(comp).connect(ctx.destination);
    } else bus.connect(ctx.destination);
    PARTS.filter((p) => p.kind === "stem").forEach((p) => write(p.id, ctx, bus));
  }
  return ctx.startRendering();
}

const cache = new Map<string, Promise<AudioBuffer>>();
const rendered = (p: Part) => {
  if (!cache.has(p.id)) cache.set(p.id, render(p));
  return cache.get(p.id)!;
};

let comments: Comment[] = [
  { id: "c1", version_id: "demo-v3", author_id: "x", author_name: "Pana", time_seconds: 10.1, body: "Love the guitar here. Can it be a bit louder?", resolved: false, created_at: "" },
  { id: "c2", version_id: "demo-v3", author_id: "y", author_name: "Chorro", time_seconds: 25.2, body: "Backing vox come in at bar 12.", resolved: true, created_at: "" },
];

export const demoSource: SessionSource = {
  async loadProject() {
    return {
      project: { id: "demo", catalogue_no: "ec-000", artist: "Demo pana", title: "Groove in C" },
      versions: [
        { id: "demo-v3", project_id: "demo", label: "mix v3", notes: "", is_current: true, created_at: "" },
      ],
      isAdmin: false,
      meName: "You",
      meEmail: "demo@chorro",
    };
  },
  async loadTracks() {
    // render all eight at once: the browser does it off the main thread
    const buffers = await Promise.all(PARTS.map(rendered));
    return PARTS.map((p, i): Track => {
      const b = buffers[i];
      return { id: p.id, version_id: "demo-v3", name: p.name, kind: p.kind, grp: p.grp, sort: i, stream_path: "", channels: p.channels, frames: b.length, duration: b.duration, peaks: peaks(b, 600) };
    });
  },
  async loadComments() {
    return [...comments].sort((a, b) => a.time_seconds - b.time_seconds);
  },
  async addComment(versionId, seconds, body) {
    const c: Comment = { id: crypto.randomUUID(), version_id: versionId, author_id: "me", author_name: "You", time_seconds: seconds, body, resolved: false, created_at: new Date().toISOString() };
    comments = [...comments, c];
    return c;
  },
  async setResolved(id, resolved) {
    comments = comments.map((c) => (c.id === id ? { ...c, resolved } : c));
  },
  async loadAudio(track) {
    const p = PARTS.find((x) => x.id === track.id)!;
    return rendered(p);
  },
};
