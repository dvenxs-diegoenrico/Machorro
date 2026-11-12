import styles from "./SixStringRule.module.css";

/** Section divider: six horizontal lines, thick to thin, like strings. */
export function SixStringRule() {
  return (
    <div className={styles.rule} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}
