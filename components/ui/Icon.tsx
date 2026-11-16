import styles from "./Icon.module.css";

export type IconName = "arrow-right" | "arrow-down" | "arrow-up-right" | "close" | "note" | "diamond" | "play" | "pause" | "lock" | "upload" | "link";

/** Each icon is drawn on a 24×24 grid with a 2px stroke, in the text colour. */
const PATHS: Record<IconName, string> = {
  "arrow-right": "M4 12h15M13 6l6 6-6 6",
  "arrow-down": "M12 4v15M6 13l6 6 6-6",
  "arrow-up-right": "M7 17L17 7M9 7h8v8",
  close: "M6 6l12 12M18 6L6 18",
  note: "M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  diamond: "M12 3l9 9-9 9-9-9z",
  play: "M7 4l13 8-13 8z",
  pause: "M7 4h4v16H7zM14 4h4v16h-4z",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  upload: "M12 16V4M6 10l6-6 6 6M4 20h16",
  link: "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
};

const FILLED: Partial<Record<IconName, true>> = { diamond: true, play: true, pause: true };

/**
 * A small vector icon that floats: it bobs gently on its own and leans toward its
 * direction when the button or link it sits in is hovered. Decorative unless `label` is given.
 */
export function Icon({ name, label, float = true, className = "" }: { name: IconName; label?: string; float?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${styles.icon} ${float ? styles.float : ""} ${styles[name] ?? ""} ${className}`}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
    >
      <path d={PATHS[name]} className={FILLED[name] ? styles.fill : undefined} />
    </svg>
  );
}
