import type { CSSProperties } from "react";
import { Liquid } from "@/components/motion/graphics/Liquid";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { Cutout } from "../Cutout";
import { Halftone } from "../Sticker";
import styles from "./Sessions.module.css";
import shared from "./sections.module.css";

export function Sessions({ locale, t }: { locale: Locale; t: Dictionary }) {
  const s = t.sessions;
  return (
    <section id="sessions" className={shared.section}>
      <Liquid tone="sand" layout="a" />
      <div className="wrap">
        <div className={styles.head}>
          <div>
            <p className={`mono ${shared.label}`}>{s.label}</p>
            <h2 className={shared.headline} data-reveal="rise">
              {s.headline}
            </h2>
          </div>
          <div className={styles.cutWrap}>
            <Halftone id="ht-sessions" className={styles.dots} />
            <div className={styles.cut} data-reveal="paste" style={{ "--i": 2 } as CSSProperties}>
              <div className="m-sway">
                <Cutout name="lolla" alt={t.alt.cutLolla} />
              </div>
            </div>
          </div>
        </div>

        <ol className={styles.cards}>
          {s.cards.map((card, i) => (
            <li key={card.title} data-reveal="paste" style={{ "--i": i } as CSSProperties}>
              <article className={`${styles.card} m-lift`}>
                <span className={`${shared.tape} ${styles.tape}`} aria-hidden="true" />
                <p className={`mono ${styles.no}`}>0{i + 1}</p>
                <h3 className={styles.title}>{card.title}</h3>
                <p className={styles.body}>{card.body}</p>
                <dl className={`mono ${styles.specs}`}>
                  <div>
                    <dt>{s.specs.turnaround}</dt>
                    <dd>{card.turnaround}</dd>
                  </div>
                  <div>
                    <dt>{s.specs.delivery}</dt>
                    <dd>{card.delivery}</dd>
                  </div>
                  <div>
                    <dt>{s.specs.from}</dt>
                    <dd>{card.from}</dd>
                  </div>
                </dl>
                <a className={`pill ${i === 0 ? "pill-red" : ""}`} href={`/${locale}#book`}>
                  {s.cta}
                </a>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
