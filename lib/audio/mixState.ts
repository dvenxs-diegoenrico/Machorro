/** Pure mixer logic, no audio: easy to test. */

export type Strip = { id: string; gain: number; pan: number; mute: boolean; solo: boolean };

/** A track is heard when it isn't muted and, if anything is soloed, it is one of the soloed. */
export function audible(strip: Strip, all: readonly Strip[]): boolean {
  if (strip.mute) return false;
  const anySolo = all.some((s) => s.solo);
  return anySolo ? strip.solo : true;
}

/** The gain the track's GainNode should get right now. */
export function effectiveGain(strip: Strip, all: readonly Strip[]): number {
  return audible(strip, all) ? strip.gain : 0;
}

/** Fader position 0–1 → linear gain, with 0.75 = 0 dB and the top = +6 dB. */
export function faderToGain(pos: number): number {
  if (pos <= 0) return 0;
  const db = pos >= 0.75 ? ((pos - 0.75) / 0.25) * 6 : -60 + (pos / 0.75) * 60;
  return 10 ** (db / 20);
}

export function gainToDb(gain: number): number {
  return gain <= 0 ? -Infinity : 20 * Math.log10(gain);
}

/** "-3.2" style readout; "-∞" at silence. */
export function dbLabel(gain: number): string {
  const db = gainToDb(gain);
  if (!Number.isFinite(db)) return "-inf";
  return (db > 0 ? "+" : "") + db.toFixed(1);
}

/** m:ss */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
