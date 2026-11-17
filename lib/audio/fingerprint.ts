/**
 * Per-listener audio fingerprint: an inaudible, periodic noise signature that rides under the music.
 *
 * Each pana gets their own pseudo-random noise, seeded by `email|projectId`. It is band-limited to
 * 1–6 kHz, has a flat spectrum, and repeats exactly every P samples (2.73 s at 48 kHz). The console
 * plays it at a level that follows the music (silent when the music is silent, about 40 dB under it
 * otherwise), so it hides inside the mix.
 *
 * Detection: fold the suspect recording into one period (sum every P-sample block; the music averages
 * out, the fingerprint adds up), then cross-correlate with each candidate's noise using phase-only
 * weighting. The right candidate gives a sharp peak; the others give noise. It works on recordings
 * made from the computer's output (screen recorders, tab capture, loopback). Speaker-to-microphone
 * recordings and heavy MP3 compression weaken or remove it.
 */

export const RATE = 48000;
export const P = 1 << 17; // 131072 samples ≈ 2.73 s
const LO = Math.ceil((1000 * P) / RATE);
const HI = Math.floor((6000 * P) / RATE);

/** In-place iterative radix-2 FFT. `inverse` scales by 1/n. */
export function fft(re: Float64Array, im: Float64Array, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) (re[i] /= n), (im[i] /= n);
}

/** A seeded PRNG (xoshiro128**) from the SHA-256 of the seed text. */
async function rng(seed: string) {
  const h = new Uint32Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`chorro-fp|${seed}`)));
  let [a, b, c, d] = [h[0], h[1], h[2], h[3]];
  return () => {
    const r = Math.imul(Math.imul(b, 5) << 7 | Math.imul(b, 5) >>> 25, 9);
    const t = b << 9;
    c ^= a;
    d ^= b;
    b ^= c;
    a ^= d;
    c ^= t;
    d = (d << 11) | (d >>> 21);
    return (r >>> 0) / 4294967296;
  };
}

/** The fingerprint's phases: unit magnitude in 1–6 kHz, random phase, nothing elsewhere. */
async function phases(seed: string) {
  const next = await rng(seed);
  const ph = new Float64Array(HI - LO + 1);
  for (let i = 0; i < ph.length; i++) ph[i] = next() * 2 * Math.PI;
  return ph;
}

/** One period of the fingerprint as audio, scaled to an RMS of 1. Loop it. */
export async function fingerprintSignal(seed: string): Promise<Float32Array> {
  const ph = await phases(seed);
  const re = new Float64Array(P);
  const im = new Float64Array(P);
  for (let k = LO; k <= HI; k++) {
    const p = ph[k - LO];
    re[k] = Math.cos(p);
    im[k] = Math.sin(p);
    re[P - k] = Math.cos(p); // Hermitian: the result is real
    im[P - k] = -Math.sin(p);
  }
  fft(re, im, true);
  let sum = 0;
  for (let i = 0; i < P; i++) sum += re[i] * re[i];
  const g = 1 / Math.sqrt(sum / P);
  const out = new Float32Array(P);
  for (let i = 0; i < P; i++) out[i] = re[i] * g;
  return out;
}

/** Fold a mono 48 kHz recording into one period and take its whitened spectrum (phase only). */
export function prepare(samples: Float32Array) {
  const re = new Float64Array(P);
  const im = new Float64Array(P);
  for (let i = 0; i < samples.length; i++) re[i % P] += samples[i];
  fft(re, im);
  for (let k = 0; k < P; k++) {
    const m = Math.hypot(re[k], im[k]) || 1;
    re[k] /= m;
    im[k] /= m;
  }
  return { re, im, seconds: samples.length / RATE };
}

/**
 * How strongly a prepared recording carries one candidate's fingerprint. Returns the correlation
 * peak in standard deviations of the background: under ~6 is nothing, over ~10 is a clear match.
 */
export async function score(prep: { re: Float64Array; im: Float64Array }, seed: string) {
  const ph = await phases(seed);
  const re = new Float64Array(P);
  const im = new Float64Array(P);
  for (let k = LO; k <= HI; k++) {
    // X · conj(S), S = e^{i·p}
    const c = Math.cos(ph[k - LO]);
    const s = Math.sin(ph[k - LO]);
    const xr = prep.re[k];
    const xi = prep.im[k];
    re[k] = xr * c + xi * s;
    im[k] = xi * c - xr * s;
  }
  fft(re, im, true);
  let peak = 0;
  let sum = 0;
  let sq = 0;
  for (let i = 0; i < P; i++) {
    const v = Math.hypot(re[i], im[i]);
    if (v > peak) peak = v;
    sum += v;
    sq += v * v;
  }
  const mean = sum / P;
  const sd = Math.sqrt(Math.max(1e-30, sq / P - mean * mean));
  return (peak - mean) / sd;
}

/** The seed for one listener on one project. */
export const seedFor = (email: string, projectId: string) => `${email.trim().toLowerCase()}|${projectId}`;
