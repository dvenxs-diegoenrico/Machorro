import type { CSSProperties } from "react";
import styles from "./graphics.module.css";

const BEATS = [0.9, 1.3, 0.7, 1.1, 0.8, 1.4, 1.0, 0.75, 1.2];

/** Level bars bouncing out of time with each other, like a meter bridge. Decorative. */
export function Equalizer({ bars = 5, className = "" }: { bars?: number; className?: string }) {
  return (
    <span className={`${styles.eq} ${className}`} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          style={{ "--beat": `${BEATS[i % BEATS.length]}s`, "--offset": `${-(i * 0.37)}s` } as CSSProperties}
        />
      ))}
    </span>
  );
}
