import styles from "./graphics.module.css";

/** Bar heights for a song-shaped waveform: quiet intro, two builds, a fade. Deterministic. */
function shape(count: number): number[] {
  const out: number[] = [];
  let seed = 9;
  for (let i = 0; i < count; i++) {
    seed = (seed * 16807) % 2147483647;
    const noise = (seed % 1000) / 1000;
    const t = i / (count - 1);
    const envelope =
      0.25 + 0.35 * Math.sin(Math.PI * t) + 0.25 * Math.abs(Math.sin(Math.PI * 3 * t)) + (t > 0.9 ? -(t - 0.9) * 3 : 0);
    out.push(Math.max(0.08, Math.min(1, envelope * (0.55 + noise * 0.6))));
  }
  return out;
}

/**
 * A waveform with a playhead running through it: played part in red, the rest muted.
 * The same look as the stem console. Decorative.
 */
export function WaveformLoop({ bars = 96, className = "" }: { bars?: number; className?: string }) {
  const heights = shape(bars);
  const w = 1000 / bars;
  const rects = heights.map((h, i) => (
    <rect key={i} x={i * w + w * 0.2} y={50 - h * 50} width={w * 0.6} height={h * 100} />
  ));
  return (
    <div className={`${styles.wave} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className={styles.waveRest}>
        {rects}
      </svg>
      {/* played part: the window slides in from the left while its contents slide the
          other way, so the red bars appear to fill up in place (transforms only) */}
      <span className={styles.playedWindow}>
        <span className={styles.playedInner}>
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className={styles.wavePlayed}>
            {rects}
          </svg>
        </span>
      </span>
      <span className={styles.headTrack}>
        <span className={styles.playhead} />
      </span>
    </div>
  );
}
