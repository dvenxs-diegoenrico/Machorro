import type { CSSProperties } from "react";
import styles from "./Marquee.module.css";
import { Icon } from "@/components/ui/Icon";

/** A ticker band. Text repeats and scrolls; pauses on hover; static under reduced motion. */
export function Marquee({
  items,
  reverse = false,
  seconds = 40,
  className = "",
}: {
  items: readonly string[];
  reverse?: boolean;
  seconds?: number;
  className?: string;
}) {
  const group = (key: string) => (
    <div className={styles.group} key={key}>
      {Array.from({ length: 6 }, (_, n) =>
        items.map((item, i) => (
          <span key={`${n}-${i}`} className={styles.item}>
            {item}
            <span className={styles.sep}><Icon name="diamond" float={false} /></span>
          </span>
        )),
      )}
    </div>
  );

  return (
    <div className={`${styles.marquee} ${className}`}>
      <p className="sr-only">{items.join(" · ")}</p>
      <div
        className={styles.track}
        aria-hidden="true"
        style={{ "--seconds": `${seconds}s`, "--dir": reverse ? "reverse" : "normal" } as CSSProperties}
      >
        {group("a")}
        {group("b")}
      </div>
    </div>
  );
}
