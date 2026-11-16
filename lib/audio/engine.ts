/**
 * The console's audio engine. Framework-free: the React console drives it through this API.
 *
 *   per track:  AudioBufferSource → Gain (fader, mute, solo) → StereoPanner → Analyser ─┐
 *                                                                                      ├→ master Gain → master Analyser → speakers
 *
 * Sync: every source starts with the same `when` and the same offset, so stems never drift.
 * Seek and pause stop all sources; play re-creates them at the new offset.
 * Modes: "stems" plays the stem tracks; "mix" and "master" each play their one file. Switching
 * keeps the playhead.
 * Buffers live only in memory and are dropped on destroy(). There is no <audio> element and no
 * blob URL anywhere, so there is nothing for the browser to offer as a download.
 */
import { effectiveGain, type Strip } from "./mixState";

export type Mode = "stems" | "mix" | "master";
export type TrackInfo = { id: string; kind: "stem" | "group" | "mix" | "master" };

type Voice = {
  info: TrackInfo;
  buffer: AudioBuffer | null;
  gain: GainNode;
  pan: StereoPannerNode;
  meter: AnalyserNode;
  source: AudioBufferSourceNode | null;
  strip: Strip;
  peak: number;
};

export type Levels = { tracks: Record<string, number>; master: number };

export class Engine {
  readonly ctx: AudioContext;
  private voices = new Map<string, Voice>();
  private master: GainNode;
  private masterMeter: AnalyserNode;
  private masterPeak = 0;
  private mode: Mode = "stems";
  private startedAt = 0; // ctx time when the current run started
  private offset = 0; // song position at that moment
  private running = false;
  private loop: { start: number; end: number } | null = null;
  private raf = 0;
  private timeCbs = new Set<(t: number) => void>();
  private levelCbs = new Set<(l: Levels) => void>();
  private scratch = new Float32Array(2048);
  duration = 0;

  constructor() {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor({ latencyHint: "playback", sampleRate: 48000 });
    this.master = this.ctx.createGain();
    this.masterMeter = this.ctx.createAnalyser();
    this.masterMeter.fftSize = 2048;
    this.master.connect(this.masterMeter).connect(this.ctx.destination);
  }

  /** Register a track; its audio arrives later through setBuffer. */
  add(info: TrackInfo) {
    const gain = this.ctx.createGain();
    const pan = this.ctx.createStereoPanner();
    const meter = this.ctx.createAnalyser();
    meter.fftSize = 2048;
    gain.connect(pan).connect(meter).connect(this.master);
    this.voices.set(info.id, {
      info,
      buffer: null,
      gain,
      pan,
      meter,
      source: null,
      strip: { id: info.id, gain: 1, pan: 0, mute: false, solo: false },
      peak: 0,
    });
    this.applyGains();
  }

  setBuffer(id: string, buffer: AudioBuffer) {
    const v = this.voices.get(id);
    if (!v) return;
    v.buffer = buffer;
    this.duration = Math.max(this.duration, buffer.duration);
  }

  /** iOS and Safari need this inside a tap before any sound. */
  async unlock() {
    if (this.ctx.state !== "running") await this.ctx.resume();
  }

  get playing() {
    return this.running;
  }

  get position(): number {
    if (!this.running) return this.offset;
    const t = this.offset + (this.ctx.currentTime - this.startedAt);
    if (this.loop && t >= this.loop.end) return this.loop.start + ((t - this.loop.start) % (this.loop.end - this.loop.start));
    return Math.min(t, this.duration);
  }

  getMode() {
    return this.mode;
  }

  setMode(mode: Mode) {
    const pos = this.position;
    const was = this.running;
    this.stopSources();
    this.mode = mode;
    this.offset = pos;
    this.applyGains();
    if (was) this.startSources();
  }

  async play() {
    await this.unlock();
    if (this.running) return;
    if (this.offset >= this.duration - 0.01) this.offset = this.loop?.start ?? 0;
    this.startSources();
    this.tick();
  }

  pause() {
    if (!this.running) return;
    this.offset = this.position;
    this.stopSources();
    this.emitTime();
  }

  toggle() {
    return this.running ? (this.pause(), false) : (this.play(), true);
  }

  seek(seconds: number) {
    const was = this.running;
    this.stopSources();
    this.offset = Math.max(0, Math.min(this.duration, seconds));
    if (was) this.startSources();
    this.emitTime();
  }

  setLoop(range: { start: number; end: number } | null) {
    this.loop = range && range.end - range.start > 0.25 ? range : null;
    if (this.running) this.seek(this.position);
  }

  setGain(id: string, gain: number) {
    this.patch(id, { gain });
  }
  setPan(id: string, pan: number) {
    const v = this.voices.get(id);
    if (!v) return;
    v.strip = { ...v.strip, pan };
    v.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime, 0.01);
  }
  setMute(id: string, mute: boolean) {
    this.patch(id, { mute });
  }
  setSolo(id: string, solo: boolean) {
    this.patch(id, { solo });
  }
  setMasterGain(gain: number) {
    this.master.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.01);
  }

  onTime(cb: (t: number) => void) {
    this.timeCbs.add(cb);
    return () => this.timeCbs.delete(cb);
  }
  onLevels(cb: (l: Levels) => void) {
    this.levelCbs.add(cb);
    return () => this.levelCbs.delete(cb);
  }

  /** Free every buffer and node. Call when leaving the console. */
  async destroy() {
    cancelAnimationFrame(this.raf);
    this.stopSources();
    for (const v of this.voices.values()) v.buffer = null;
    this.voices.clear();
    this.timeCbs.clear();
    this.levelCbs.clear();
    await this.ctx.close().catch(() => undefined);
  }

  // ── internals ──────────────────────────────────────────────

  private patch(id: string, p: Partial<Strip>) {
    const v = this.voices.get(id);
    if (!v) return;
    v.strip = { ...v.strip, ...p };
    this.applyGains();
  }

  /** Which tracks the current mode plays. */
  private inMode(v: Voice) {
    if (this.mode === "stems") return v.info.kind === "stem" || v.info.kind === "group";
    return v.info.kind === this.mode;
  }

  private applyGains() {
    const strips = [...this.voices.values()].filter((v) => this.inMode(v)).map((v) => v.strip);
    for (const v of this.voices.values()) {
      const g = this.inMode(v) ? effectiveGain(v.strip, strips) : 0;
      v.gain.gain.setTargetAtTime(g, this.ctx.currentTime, 0.008);
    }
  }

  private startSources() {
    const when = this.ctx.currentTime + 0.06; // every source starts on the same sample
    for (const v of this.voices.values()) {
      if (!v.buffer || !this.inMode(v)) continue;
      const src = this.ctx.createBufferSource();
      src.buffer = v.buffer;
      if (this.loop) {
        src.loop = true;
        src.loopStart = this.loop.start;
        src.loopEnd = this.loop.end;
      }
      src.connect(v.gain);
      src.start(when, Math.min(this.offset, v.buffer.duration));
      v.source = src;
    }
    this.startedAt = when;
    this.running = true;
  }

  private stopSources() {
    for (const v of this.voices.values()) {
      try {
        v.source?.stop();
      } catch {
        /* already stopped */
      }
      v.source?.disconnect();
      v.source = null;
    }
    this.running = false;
  }

  private emitTime() {
    const t = this.position;
    this.timeCbs.forEach((cb) => cb(t));
  }

  private level(an: AnalyserNode, prev: number) {
    if (this.scratch.length !== an.fftSize) this.scratch = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(this.scratch);
    let p = 0;
    for (let i = 0; i < this.scratch.length; i++) p = Math.max(p, Math.abs(this.scratch[i]));
    return p > prev ? p : prev * 0.9; // fast attack, smooth fall
  }

  private tick = () => {
    if (this.running && this.position >= this.duration - 0.005 && !this.loop) {
      this.offset = this.duration;
      this.stopSources();
    }
    this.emitTime();
    const tracks: Record<string, number> = {};
    for (const [id, v] of this.voices) tracks[id] = v.peak = this.level(v.meter, v.peak);
    this.masterPeak = this.level(this.masterMeter, this.masterPeak);
    const levels = { tracks, master: this.masterPeak };
    this.levelCbs.forEach((cb) => cb(levels));
    if (this.running || this.masterPeak > 0.001) this.raf = requestAnimationFrame(this.tick);
  };
}
