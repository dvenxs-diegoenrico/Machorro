import { describe, expect, it } from "vitest";
import { P, RATE, fingerprintSignal, prepare, score, seedFor } from "./fingerprint";

/** A busy, song-like signal: chords, a beat, and some noise, with loud and quiet parts. */
function song(seconds: number) {
  const n = seconds * RATE;
  const x = new Float32Array(n);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.07 * t) ** 2;
    const chord = [130.8, 164.8, 196, 246.9, 293.7].reduce((s, f) => s + Math.sin(2 * Math.PI * f * t), 0) / 5;
    const kick = Math.exp(-((t * 1.6) % 1) * 30) * Math.sin(2 * Math.PI * 55 * t);
    x[i] = env * (0.35 * chord + 0.4 * kick + 0.05 * rnd());
  }
  return x;
}

/** What the console does: the fingerprint, scaled by the music's smoothed level. */
async function marked(x: Float32Array, email: string, project: string, level = 0.012, offset = 12345) {
  const fp = await fingerprintSignal(seedFor(email, project));
  const out = new Float32Array(x.length);
  let env = 0;
  const a = 1 - Math.exp((-2 * Math.PI * 6) / RATE); // ~6 Hz smoothing, like the console's filter
  for (let i = 0; i < x.length; i++) {
    env += a * (Math.abs(x[i]) - env);
    out[i] = x[i] + level * env * fp[(i + offset) % P];
  }
  return out;
}

const quantise16 = (x: Float32Array) => x.map((v) => Math.round(Math.max(-1, Math.min(1, v)) * 32767) / 32767);
const panas = Array.from({ length: 10 }, (_, i) => `pana${i}@example.com`);
const project = "6f1c2c1e-0000-4000-8000-000000000001";

describe("listener fingerprint", () => {
  it("is quiet: about 40 dB under the music", async () => {
    const x = song(10);
    const y = await marked(x, panas[3], project);
    let sig = 0;
    let diff = 0;
    for (let i = 0; i < x.length; i++) (sig += x[i] ** 2), (diff += (y[i] - x[i]) ** 2);
    expect(10 * Math.log10(sig / diff)).toBeGreaterThan(38);
  });

  it("names the right pana from a 20-second clip cut from the middle", async () => {
    const full = quantise16(await marked(song(60), panas[3], project));
    const clip = full.slice(17 * RATE + 4321, 37 * RATE + 4321); // arbitrary start, not period-aligned
    const prep = prepare(clip);
    const scores = await Promise.all(panas.map((e) => score(prep, seedFor(e, project))));
    const best = scores.indexOf(Math.max(...scores));
    expect(best).toBe(3);
    expect(scores[3]).toBeGreaterThan(10);
    for (const [i, s] of scores.entries()) if (i !== 3) expect(s).toBeLessThan(7);
  }, 60000);

  it("doesn't accuse anyone on an unmarked recording", async () => {
    const prep = prepare(quantise16(song(20)));
    const scores = await Promise.all(panas.map((e) => score(prep, seedFor(e, project))));
    for (const s of scores) expect(s).toBeLessThan(7);
  }, 60000);

  it("is per project: the same pana on another project doesn't match", async () => {
    const prep = prepare(quantise16(await marked(song(20), panas[3], project)));
    expect(await score(prep, seedFor(panas[3], "another-project"))).toBeLessThan(7);
  }, 60000);
});
