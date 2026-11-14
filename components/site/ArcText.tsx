import { useId } from "react";
import styles from "./ArcText.module.css";

/**
 * Curved lettering: bold caps set on an arc (bend > 0 arches up, < 0 smiles),
 * or all the way round a ring. Scales with its container's width.
 */
export function ArcText({
  text,
  bend = 60,
  ring = false,
  spin = false,
  className = "",
}: {
  text: string;
  bend?: number;
  ring?: boolean;
  spin?: boolean;
  className?: string;
}) {
  const id = useId();

  if (ring) {
    const around = text.length > 22 ? `${text} • ` : `${text} • ${text} • `;
    return (
      <span className={`${styles.arc} ${className}`}>
        <span className="sr-only">{text}</span>
        <svg viewBox="0 0 200 200" aria-hidden="true" className={spin ? "m-spin" : undefined}>
          <defs>
            <path id={id} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
          </defs>
          <text className={styles.ringText}>
            <textPath href={`#${id}`} textLength="482" lengthAdjust="spacingAndGlyphs">
              {around}
            </textPath>
          </text>
        </svg>
      </span>
    );
  }

  const h = Math.abs(bend) + 70;
  const base = bend > 0 ? h - 14 : 56;
  const d = `M 12 ${base} Q 300 ${base - bend * 2} 588 ${base}`;
  return (
    <span className={`${styles.arc} ${className}`}>
      <span className="sr-only">{text}</span>
      <svg viewBox={`0 0 600 ${h}`} aria-hidden="true">
        <defs>
          <path id={id} d={d} />
        </defs>
        <text className={styles.arcText} textAnchor="middle" style={{ fontSize: Math.min(46, 1000 / text.length) }}>
          <textPath href={`#${id}`} startOffset="50%">
            {text}
          </textPath>
        </text>
      </svg>
    </span>
  );
}
