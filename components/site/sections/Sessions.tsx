import type { CSSProperties } from "react";
import { Words } from "@/components/motion/Words";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import styles from "./Sessions.module.css";
import shared from "./sections.module.css";

export function Sessions({ locale, t }: { locale: Locale; t: Dictionary }) {
  const s = t.sessions;
  return (
    <section id="sessions" className={shared.section}>
      <div className="wrap">
        <div className={styles.head}>
          <div>
            <p className={`caps ${shared.label}`} data-reveal="rise">{s.label}</p>
            <h2 className={shared.headline} data-reveal="mask">
              <Words text={s.headline} />
            </h2>
          </div>
          <p className={styles.intro} data-reveal="rise" style={{ "--i": 1 } as CSSProperties}>
            {s.body}
          </p>
        </div>

        <ol className={styles.cards} data-reveal="group">
          {s.cards.map((card, i) => (
            <li key={card.title} style={{ "--i": i * 2 } as CSSProperties}>
              <article className={styles.card}>
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
                <a className={`btn ${i === 0 ? "btn-red" : ""}`} href={`/${locale}#book`}>
                  {s.cta}
                </a>
              </article>
            </li>
          ))}
        </ol>

        {/* the postscript: the fourth thing you get */}
        <p className={styles.ps} data-reveal="rise">
          <span className={`caps ${styles.psLabel}`}>{s.ps.label}</span>
          <span className={`mono ${styles.no}`}>{s.ps.no}</span>
          <span className={styles.psTitle}>{s.ps.title}</span>
          <span className={styles.psBody}>{s.ps.body}</span>
        </p>
      </div>
    </section>
  );
}
