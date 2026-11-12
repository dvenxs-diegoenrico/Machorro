import styles from "./Wordmark.module.css";

/** Red dot + `chorro` in Instrument Serif italic. Never caps, never bold. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`${styles.wordmark} ${className}`}>
      <span className={`${styles.dot} m-pulse`} aria-hidden="true" />
      chorro
    </span>
  );
}
