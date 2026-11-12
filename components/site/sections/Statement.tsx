import Image from "next/image";
import type { CSSProperties } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { Burst } from "../Sticker";
import styles from "./Statement.module.css";

/** The red band. One sentence, word by word, with Elvis keeping an eye on it. */
export function Statement({ t }: { t: Dictionary }) {
  const words = t.statement.words.split(" ");
  return (
    <section className={styles.band}>
      <div className={`wrap ${styles.inner}`}>
        <p className={styles.words} data-reveal="words">
          {words.map((w, i) => (
            <span key={i} style={{ "--i": i } as CSSProperties}>
              {w}&nbsp;
            </span>
          ))}
        </p>
        <div className={styles.burst} data-reveal="pop" style={{ "--i": 8 } as CSSProperties}>
          <Burst lines={t.statement.burst} tone="pool" />
        </div>
      </div>
      <div className={styles.elvis} data-reveal="slide-right">
        <Image
          src="/assets/elvis-cutout.png"
          alt={t.alt.elvis}
          width={1911}
          height={1472}
          sizes="(max-width: 900px) 60vw, 34vw"
        />
      </div>
    </section>
  );
}
