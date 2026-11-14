import type { CSSProperties } from "react";
import { Liquid } from "@/components/motion/graphics/Liquid";
import type { Dictionary } from "@/lib/i18n/dictionary";
import styles from "./Statement.module.css";

/** The olive band. One sentence, word by word. */
export function Statement({ t }: { t: Dictionary }) {
  const words = t.statement.words.split(" ");
  return (
    <section className={styles.band} data-theme="night">
      <Liquid tone="night" layout="a" />
      <div className="wrap">
        <p className={styles.words} data-reveal="words">
          {words.map((w, i) => (
            <span key={i} style={{ "--i": i } as CSSProperties}>
              {w}&nbsp;
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
