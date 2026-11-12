import type { CSSProperties } from "react";
import styles from "./SixStringRule.module.css";

/** Section divider: six horizontal lines, thick to thin, like strings. They draw in, and pluck on hover. */
export function SixStringRule() {
  return (
    <div className={styles.rule} aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={styles.string}>
          <span data-reveal="draw" style={{ "--i": i } as CSSProperties} />
        </span>
      ))}
    </div>
  );
}
