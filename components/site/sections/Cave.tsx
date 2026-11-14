import Image from "next/image";
import type { CSSProperties } from "react";
import { siteConfig } from "@/content/site.config";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { Marquee } from "../Marquee";
import styles from "./Cave.module.css";

/** Elvis Cave, poster mode, Night theme. */
export function Cave({ locale, t }: { locale: Locale; t: Dictionary }) {
  const photos = [
    { src: "/assets/gear-room.jpg", alt: t.alt.gearRoom, w: 528, h: 654 },
    { src: "/assets/api-lamp.jpg", alt: t.alt.apiLamp, w: 528, h: 653 },
    { src: "/assets/big-room.jpg", alt: t.alt.bigRoom, w: 529, h: 654 },
    { src: "/assets/hands-acoustic.jpg", alt: t.alt.handsAcoustic, w: 528, h: 378 },
  ];

  return (
    <section id="elvis-cave" data-theme="night" className={styles.cave}>
      <Marquee className={styles.band} items={[siteConfig.bookingOpen ? t.ticker.open : t.ticker.full]} seconds={50} />

      <div className={`wrap ${styles.poster}`}>
        <p className={styles.kicker} data-reveal="rise">
          {t.cave.kicker}
        </p>
        <h2 className={styles.lockup} aria-label="Elvis Cave">
          <span data-reveal="slide-left" aria-hidden="true">
            Elvis
          </span>
          <span className={styles.crest} data-reveal="pop" style={{ "--i": 4 } as CSSProperties}>
            <span className={styles.crestSpin}>
              <Image src="/assets/elvis-crest.jpg" alt={t.alt.crest} width={1776} height={1667} sizes="(max-width: 900px) 30vw, 18vw" />
            </span>
          </span>
          <span data-reveal="slide-right" aria-hidden="true">
            Cave
          </span>
        </h2>

        <div className={styles.info}>
          <dl className={`mono ${styles.specs}`} aria-label={t.cave.specsLabel}>
            {t.cave.specs.map(([k, v], i) => (
              <div key={k}>
                <span className={styles.line} data-reveal="draw" style={{ "--i": i } as CSSProperties} />
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.pitch} data-reveal="rise" style={{ "--i": 2 } as CSSProperties}>
            <p>{t.cave.body}</p>
            <a className="pill pill-red" href={`/${locale}#book`}>
              {t.cave.cta}
            </a>
          </div>
        </div>
      </div>

      <ul className={styles.strip} tabIndex={0} aria-label={t.cave.specsLabel}>
        {photos.map((p, i) => (
          <li key={p.src} data-reveal="paste" style={{ "--i": i } as CSSProperties}>
            <Image className="m-lift" src={p.src} alt={p.alt} width={p.w} height={p.h} sizes="(max-width: 900px) 50vw, 25vw" />
          </li>
        ))}
      </ul>

      <Marquee className={styles.band} items={t.cave.bandBottom} reverse seconds={50} />
    </section>
  );
}
