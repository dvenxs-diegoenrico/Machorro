/**
 * Plucked guitar strings, synthesised with Karplus–Strong: a burst of noise fed
 * through a short delay line with a gentle low-pass. Each note is rendered once
 * into an AudioBuffer, then replayed. No samples, no dependencies.
 *
 * Browsers only allow audio after a user gesture, so the first sound must come
 * from a click or tap (`unlock()`); after that, `pluck()` works from anything.
 */

/** Standard tuning, low to high: E2 A2 D3 G3 B3 E4. */
export const STANDARD_TUNING = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63] as const;

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
const cache = new Map<string, AudioBuffer>();

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    // a soft master level and a touch of warmth, so it never startles
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 3800;
    out = ctx.createGain();
    out.gain.value = 0.22;
    out.connect(tone).connect(ctx.destination);
  }
  return ctx;
}

/** True once the browser has allowed sound on this page. */
export function isUnlocked(): boolean {
  return ctx?.state === "running";
}

/** Call from a click / tap handler. iOS needs the resume inside the gesture. */
export async function unlock(): Promise<boolean> {
  const c = context();
  if (!c) return false;
  if (c.state !== "running") await c.resume().catch(() => undefined);
  return c.state === "running";
}

/** Render one plucked note. Exported for tests. */
export function renderPluck(freq: number, sampleRate: number, seconds = 2.4, brightness = 0.5): Float32Array {
  const length = Math.floor(sampleRate * seconds);
  const data = new Float32Array(length);
  const period = Math.max(2, Math.round(sampleRate / freq));
  const line = new Float32Array(period);
  // the pluck: noise, slightly low-passed so the attack isn't harsh
  let prev = 0;
  for (let i = 0; i < period; i++) {
    const n = Math.random() * 2 - 1;
    prev = prev + brightness * (n - prev);
    line[i] = prev;
  }
  // low strings ring longer than high ones
  const decay = 0.996 + Math.min(0.0035, 0.35 / freq);
  let idx = 0;
  for (let i = 0; i < length; i++) {
    const next = (idx + 1) % period;
    const v = line[idx];
    line[idx] = decay * 0.5 * (v + line[next]);
    data[i] = v;
    idx = next;
  }
  // short fade at the very end so it never clicks
  const tail = Math.min(length, Math.floor(sampleRate * 0.05));
  for (let i = 0; i < tail; i++) data[length - 1 - i] *= i / tail;
  return data;
}

/**
 * Play a note. `velocity` 0–1 sets the level; `pan` -1…1 places it.
 * Does nothing until `unlock()` has succeeded.
 */
export function pluck(freq: number, velocity = 0.7, pan = 0): void {
  const c = ctx;
  if (!c || !out || c.state !== "running") return;
  const key = `${freq}`;
  let buffer = cache.get(key);
  if (!buffer) {
    buffer = c.createBuffer(1, Math.floor(c.sampleRate * 2.4), c.sampleRate);
    buffer.getChannelData(0).set(renderPluck(freq, c.sampleRate));
    cache.set(key, buffer);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const level = c.createGain();
  level.gain.value = Math.max(0.05, Math.min(1, velocity));
  const panner = c.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  src.connect(level).connect(panner).connect(out);
  src.start();
}
