/**
 * The session file format: compress in the producer's browser, encrypt, and only then upload.
 *
 *   WAV (any bit depth / rate)  ─decode→  PCM @ 48 kHz  ─WebCodecs→  Opus 256 kbps
 *   (or AAC 256 kbps where Opus encoding isn't available)  ─pack→  .chorro  ─AES-GCM→  upload
 *
 * Why:
 *   * Quality: Opus at 256 kbps stereo is transparent for listening (blind tests can't tell it
 *     from the WAV). Mono stems get 160 kbps, which is the same quality per channel.
 *   * Size: about 1/6 of a 16-bit WAV and 1/9 of a 24-bit/48k one. The WAV never leaves Dani's computer.
 *   * Protection: a .chorro file is our own container, encrypted with a per-track key. Downloaded
 *     on its own it is noise; it only plays inside the console, after the server hands over the key.
 *
 * Format (before encryption):
 *   "CHRO" | u8 version | u32 header length | header JSON | (u32 length | packet bytes)*
 * Encrypted:
 *   12-byte IV | AES-256-GCM ciphertext
 */

export type StreamHeader = {
  codec: string; // "opus" or "mp4a.40.2"
  sampleRate: number;
  channels: number;
  /** length of the original audio, in sample frames at sampleRate */
  frames: number;
  /** decoder description (AAC only), base64 */
  description?: string;
  /** samples of encoder delay at the start of the decoded stream, measured at encode time */
  priming: number;
};

export type Encoded = { header: StreamHeader; packets: Uint8Array[] };

const MAGIC = [0x43, 0x48, 0x52, 0x4f]; // "CHRO"
export const RATE = 48000;

/** True when this browser can compress and encrypt (the producer panel needs it). */
export function canEncode(): boolean {
  return typeof AudioEncoder !== "undefined" && typeof crypto?.subtle !== "undefined";
}

/** True when this browser can play session files (the pana console needs it). */
export function canDecode(): boolean {
  return typeof AudioDecoder !== "undefined" && typeof crypto?.subtle !== "undefined";
}

/** WAV (or AIFF, FLAC, MP3) file → PCM at 48 kHz, original channel count (1 or 2). */
export async function decodeFile(file: Blob): Promise<AudioBuffer> {
  const bytes = await file.arrayBuffer();
  const probe = new OfflineAudioContext(2, 1, RATE);
  const buffer = await probe.decodeAudioData(bytes);
  if (buffer.numberOfChannels <= 2) return buffer;
  // more than two channels: fold down to stereo
  const ctx = new OfflineAudioContext(2, buffer.length, RATE);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start();
  return ctx.startRendering();
}

/** Is a "stereo" buffer really mono (both sides identical)? Mono stems compress to half. */
export function isEffectivelyMono(buffer: AudioBuffer): boolean {
  if (buffer.numberOfChannels === 1) return true;
  const l = buffer.getChannelData(0);
  const r = buffer.getChannelData(1);
  const step = Math.max(1, Math.floor(l.length / 20000));
  for (let i = 0; i < l.length; i += step) if (Math.abs(l[i] - r[i]) > 1e-4) return false;
  return true;
}

async function pickConfig(channels: number): Promise<AudioEncoderConfig> {
  const bitrate = channels === 1 ? 160_000 : 256_000;
  const opus: AudioEncoderConfig = {
    codec: "opus",
    sampleRate: RATE,
    numberOfChannels: channels,
    bitrate,
    // @ts-expect-error opus-specific options are in the WebCodecs registry, not every lib.dom yet
    opus: { application: "audio", complexity: 10, frameDuration: 20000 },
  };
  if ((await AudioEncoder.isConfigSupported(opus)).supported) return opus;
  const aac: AudioEncoderConfig = { codec: "mp4a.40.2", sampleRate: RATE, numberOfChannels: channels, bitrate };
  if ((await AudioEncoder.isConfigSupported(aac)).supported) return aac;
  throw new Error("This browser can't compress audio. Use the latest Chrome, Edge or Safari.");
}

/** Encode planar PCM with one config. */
async function run(config: AudioEncoderConfig, planes: Float32Array[], onProgress?: (p: number) => void) {
  const channels = planes.length;
  const total = planes[0].length;
  const packets: Uint8Array[] = [];
  let description: string | undefined;
  let failure: unknown = null;
  const encoder = new AudioEncoder({
    output: (chunk, meta) => {
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      packets.push(data);
      const d = meta?.decoderConfig?.description;
      if (d && !description) description = toBase64(new Uint8Array(d instanceof ArrayBuffer ? d : (d as ArrayBufferView).buffer));
    },
    error: (e) => (failure = e),
  });
  encoder.configure(config);
  const step = RATE; // one second per AudioData
  for (let start = 0; start < total; start += step) {
    if (failure) throw failure;
    const n = Math.min(step, total - start);
    const data = new Float32Array(n * channels);
    for (let c = 0; c < channels; c++) data.set(planes[c].subarray(start, start + n), c * n);
    const frame = new AudioData({
      format: "f32-planar",
      sampleRate: RATE,
      numberOfFrames: n,
      numberOfChannels: channels,
      timestamp: Math.round((start / RATE) * 1e6),
      data,
    });
    encoder.encode(frame);
    frame.close();
    // let the encoder drain so memory stays flat on long files
    if (encoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 0));
    onProgress?.(Math.min(0.99, (start + n) / total));
  }
  await encoder.flush();
  encoder.close();
  if (failure) throw failure;
  return { packets, description };
}

/**
 * Encoders add a small, fixed delay at the start. Measure it for this browser and config by
 * encoding a short burst of noise and finding where it lands after decoding.
 */
async function measurePriming(config: AudioEncoderConfig): Promise<number> {
  const n = RATE / 2;
  let seed = 7;
  const noise = new Float32Array(n);
  for (let i = 0; i < n; i++) noise[i] = (((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1) * 0.5;
  const planes = Array.from({ length: config.numberOfChannels }, () => noise);
  const { packets, description } = await run(config, planes);
  const head: StreamHeader = { codec: config.codec, sampleRate: RATE, channels: config.numberOfChannels, frames: n, description, priming: 0 };
  const raw = await decodeRaw({ header: head, packets });
  let best = 0;
  let bestScore = -Infinity;
  for (let lag = 0; lag < 4096 && lag + 8192 < raw.length; lag++) {
    let score = 0;
    for (let i = 2048; i < 8192; i += 2) score += noise[i] * raw[i + lag];
    if (score > bestScore) [bestScore, best] = [score, lag];
  }
  return best;
}

/** Compress PCM with WebCodecs. `onProgress` gets 0–1. */
export async function encode(buffer: AudioBuffer, onProgress?: (p: number) => void): Promise<Encoded> {
  const channels = isEffectivelyMono(buffer) ? 1 : Math.min(2, buffer.numberOfChannels);
  const config = await pickConfig(channels);
  const priming = await measurePriming(config);
  const planes = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  const { packets, description } = await run(config, planes, onProgress);
  onProgress?.(1);
  return { header: { codec: config.codec, sampleRate: RATE, channels, frames: buffer.length, description, priming }, packets };
}

/** Encoded → bytes in the .chorro container. */
export function pack({ header, packets }: Encoded): Uint8Array<ArrayBuffer> {
  const head = new TextEncoder().encode(JSON.stringify(header));
  const size = 4 + 1 + 4 + head.length + packets.reduce((s, p) => s + 4 + p.length, 0);
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  out.set(MAGIC, 0);
  out[4] = 1;
  view.setUint32(5, head.length);
  out.set(head, 9);
  let o = 9 + head.length;
  for (const p of packets) {
    view.setUint32(o, p.length);
    out.set(p, o + 4);
    o += 4 + p.length;
  }
  return out;
}

/** Bytes in the .chorro container → Encoded. Throws on anything that isn't one. */
export function unpack(bytes: Uint8Array): Encoded {
  if (bytes.length < 9 || MAGIC.some((m, i) => bytes[i] !== m)) throw new Error("Not a session file.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headLen = view.getUint32(5);
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(9, 9 + headLen))) as StreamHeader;
  const packets: Uint8Array[] = [];
  let o = 9 + headLen;
  while (o + 4 <= bytes.length) {
    const n = view.getUint32(o);
    packets.push(bytes.subarray(o + 4, o + 4 + n));
    o += 4 + n;
  }
  return { header, packets };
}

/** Encrypt with a fresh AES-256-GCM key. Returns the ciphertext (IV first) and the key, base64. */
export async function encrypt(plain: Uint8Array<ArrayBuffer>): Promise<{ cipher: Uint8Array<ArrayBuffer>; key: string }> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
  const cipher = new Uint8Array(12 + ct.length);
  cipher.set(iv, 0);
  cipher.set(ct, 12);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  return { cipher, key: toBase64(raw) };
}

export async function decrypt(cipher: Uint8Array<ArrayBuffer>, keyB64: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", fromBase64(keyB64), "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: cipher.subarray(0, 12) }, key, cipher.subarray(12));
  return new Uint8Array(plain);
}

/** Decode packets to planar chunks, untrimmed. */
async function decodePlanes({ header, packets }: Encoded): Promise<{ planes: Float32Array[][]; decoded: number }> {
  const planes: Float32Array[][] = Array.from({ length: header.channels }, () => []);
  let decoded = 0;
  let failure: unknown = null;
  const decoder = new AudioDecoder({
    output: (frame) => {
      const n = frame.numberOfFrames;
      for (let c = 0; c < header.channels; c++) {
        const plane = new Float32Array(n);
        frame.copyTo(plane, { planeIndex: c, format: "f32-planar" });
        planes[c].push(plane);
      }
      decoded += n;
      frame.close();
    },
    error: (e) => (failure = e),
  });
  decoder.configure({
    codec: header.codec,
    sampleRate: header.sampleRate,
    numberOfChannels: header.channels,
    description: header.description ? fromBase64(header.description) : undefined,
  });
  const per = header.codec === "opus" ? 960 : 1024; // samples per packet
  packets.forEach((p, i) =>
    decoder.decode(new EncodedAudioChunk({ type: "key", timestamp: Math.round(((i * per) / header.sampleRate) * 1e6), data: p })),
  );
  await decoder.flush();
  decoder.close();
  if (failure) throw failure;
  return { planes, decoded };
}

/** First channel, untrimmed (used to measure the encoder delay). */
async function decodeRaw(enc: Encoded): Promise<Float32Array> {
  const { planes, decoded } = await decodePlanes(enc);
  const out = new Float32Array(decoded);
  let o = 0;
  for (const chunk of planes[0]) {
    out.set(chunk, o);
    o += chunk.length;
  }
  return out;
}

/** Encoded → an AudioBuffer in `ctx`, trimmed to the original audio (drops the encoder delay). */
export async function decodeToBuffer(enc: Encoded, ctx: BaseAudioContext): Promise<AudioBuffer> {
  const { header } = enc;
  const { planes } = await decodePlanes(enc);
  const skip = header.priming;
  const out = ctx.createBuffer(header.channels, header.frames, header.sampleRate);
  for (let c = 0; c < header.channels; c++) {
    const dest = out.getChannelData(c);
    let read = 0; // position in the decoded stream
    for (const chunk of planes[c]) {
      const from = Math.max(0, skip - read);
      if (from < chunk.length) {
        const at = read + from - skip;
        dest.set(chunk.subarray(from, Math.min(chunk.length, from + (header.frames - at))), at);
      }
      read += chunk.length;
      if (read - skip >= header.frames) break;
    }
  }
  return out;
}

/** A waveform overview: `n` peak values 0–1 from all channels. Stored, so nobody decodes just to draw. */
export function peaks(buffer: AudioBuffer, n = 800): number[] {
  const per = Math.max(1, Math.floor(buffer.length / n));
  const chans = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let m = 0;
    const end = Math.min(buffer.length, (i + 1) * per);
    for (let s = i * per; s < end; s += 4) for (const ch of chans) m = Math.max(m, Math.abs(ch[s]));
    out.push(Math.round(Math.min(1, m) * 1000) / 1000);
  }
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
