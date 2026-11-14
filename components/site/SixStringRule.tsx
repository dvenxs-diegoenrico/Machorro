import type { CSSProperties } from "react";
import styles from "./SixStringRule.module.css";

/**
 * Section divider: six strings, thick to thin. They ring when they scroll into view
 * and again when you run the pointer over them, then settle flat.
 */
export function SixStringRule() {
  // one string drawn as a standing wave; at rest it is squashed flat
  let d = "M0 8";
  for (let i = 0; i < 8; i++) d += ` Q${i * 125 + 62.5} ${i % 2 ? 16 : 0} ${(i + 1) * 125} 8`;

  return (
    <div className={styles.rule} aria-hidden="true" data-reveal="strings">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={styles.string} viewBox="0 0 1000 16" preserveAspectRatio="none" style={{ "--i": i } as CSSProperties}>
          <path d={d} />
        </svg>
      ))}
    </div>
  );
}
