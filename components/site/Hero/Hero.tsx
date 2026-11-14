import Image from "next/image";
import type { CSSProperties } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import styles from "./Hero.module.css";
import { Parallax } from "./Parallax";

/**
 * The hero: his stage photo, full-bleed, with a warm haze (scripts/hero_edit.py),
 * and CHORRO across the bottom as big as the page allows. The header sits on top.
 */
export function Hero({ t }: { t: Dictionary }) {
  const letters = [...t.hero.word.toUpperCase()];

  return (
    <section className={styles.hero}>
      <Parallax className={styles.stage}>
        <div className={styles.photo}>
          <Image
            src="/assets/hero-stage.jpg"
            alt={t.alt.heroStage}
            fill
            priority
            sizes="100vw"
            className={styles.img}
          />
        </div>
        <div className={styles.wash} aria-hidden="true" />

        <div className={styles.content}>
          <div className={styles.row}>
            <div className={styles.ctas}>
              <a className="btn btn-red" href="#book">
                {t.hero.book}
              </a>
              <a className="btn" href="#work">
                {t.hero.hear}
              </a>
            </div>
            <p className={styles.role}>
              {t.hero.name} — {t.hero.role}
            </p>
          </div>
          <h1 className={styles.word} aria-label={`${t.hero.word} — ${t.hero.name}`}>
            {letters.map((ch, i) => (
              <span key={i} aria-hidden="true" className={styles.slot}>
                <span style={{ "--i": i } as CSSProperties}>{ch}</span>
              </span>
            ))}
          </h1>
        </div>
      </Parallax>
    </section>
  );
}
