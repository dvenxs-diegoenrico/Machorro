import { burstPoints } from "@/lib/shapes/torn";
import styles from "./Sticker.module.css";

/** A starburst sticker with two short lines of poster type. Wobbles slowly. */
export function Burst({
  lines,
  tone = "pop",
  className = "",
}: {
  lines: readonly string[];
  tone?: "pop" | "electric" | "euca" | "ink";
  className?: string;
}) {
  return (
    <span className={`${styles.burst} ${styles[tone]} ${className}`} role="img" aria-label={lines.join(" ")}>
      <svg viewBox="0 0 100 100" aria-hidden="true" className="m-spin" style={{ "--spin": "48s" } as React.CSSProperties}>
        <polygon points={burstPoints()} />
      </svg>
      <span className={styles.text} aria-hidden="true">
        {lines.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </span>
    </span>
  );
}

/** A marker scribble under a word. Draws itself when it scrolls in. */
export function Scribble({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`${styles.scribble} ${className}`}
      viewBox="0 0 300 24"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-reveal="stroke"
    >
      <path pathLength={1} d="M4 14 C 40 4, 70 22, 110 12 S 180 4, 214 13 S 270 20, 296 8 M 30 20 C 90 14, 170 22, 250 16" />
    </svg>
  );
}

/** A patch of halftone dots, as printed. Decorative. */
export function Halftone({ id, className = "" }: { id: string; className?: string }) {
  return (
    <svg className={`${styles.halftone} ${className}`} aria-hidden="true">
      <defs>
        <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
          <circle cx="5" cy="5" r="2.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
