import type { CSSProperties } from "react";
import { Liquid } from "@/components/motion/graphics/Liquid";
import { siteConfig } from "@/content/site.config";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { scallopCircle, ticketEdges } from "@/lib/shapes/torn";
import { ArcText } from "../ArcText";
import { Cutout } from "../Cutout";
import styles from "./Hero.module.css";
import { Parallax } from "./Parallax";

/**
 * The hero, in three planes:
 *   back   the headline, as big as the page allows
 *   middle Chorro, cut out, really big, standing over the type
 *   top    buttons, the booking badge and the now-spinning ticket
 * The planes move at different speeds with the pointer and on scroll.
 */
export function Hero({ locale, t }: { locale: Locale; t: Dictionary }) {
  const { nowSpinning, bookingMonth } = siteConfig;
  const lines = t.hero.ransom;
  const longest = Math.max(...lines.map((l) => l.length));

  return (
    <section className={styles.hero}>
      <Liquid tone="paper" layout="a" />
      <Parallax className={styles.stage}>
        {/* back plane */}
        <div className={`${styles.plane} ${styles.back}`}>
          <h1 className={styles.type} style={{ "--n": longest } as CSSProperties} aria-label={lines.join(" ")}>
            {lines.map((line, i) => (
              <span key={line} className={styles.line} aria-hidden="true">
                <span style={{ "--i": i } as CSSProperties}>{line}</span>
              </span>
            ))}
          </h1>
        </div>

        {/* middle plane */}
        <div className={`${styles.plane} ${styles.mid}`}>
          <div className={styles.subject}>
            <Cutout name="lespaul" alt={t.alt.cutLespaul} sizes="(max-width: 900px) 80vw, 40vw" priority className="m-wobble" />
          </div>
        </div>

        {/* top plane */}
        <div className={`${styles.plane} ${styles.top}`}>
          <div className={styles.badge}>
            <div className={`${styles.badgeFace} m-wobble`} style={{ clipPath: scallopCircle() }}>
              <ArcText ring spin text={`${t.ticker.booking} ${bookingMonth[locale]} · ${t.ticker.where}`} />
              <span className={styles.badgeDot} aria-hidden="true" />
            </div>
          </div>

          <a className={`mono ${styles.ticket}`} href="#work" style={{ clipPath: ticketEdges() }}>
            <span>
              <span aria-hidden="true">● </span>
              {t.ticker.nowSpinning} — {nowSpinning.artist[locale]} · {nowSpinning.song[locale]}
            </span>
            <span className={styles.stub}>{t.hero.credits} →</span>
          </a>

          <div className={styles.ctas}>
            <a className="pill pill-red" href="#book">
              {t.hero.book}
            </a>
            <a className="pill" href="#work">
              {t.hero.hear}
            </a>
          </div>
        </div>
      </Parallax>
    </section>
  );
}
