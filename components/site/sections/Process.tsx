import type { CSSProperties } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { Cutout } from "../Cutout";
import styles from "./Process.module.css";
import shared from "./sections.module.css";

/** 01–04. The step borders thin out like strings. */
export function Process({ t }: { t: Dictionary }) {
  return (
    <section id="process" className={shared.section}>
      <div className="wrap">
        <div className={styles.head}>
          <div>
            <p className={`mono ${shared.label}`}>{t.process.label}</p>
            <h2 className={shared.headline} data-reveal="rise">
              {t.process.headline}
            </h2>
          </div>
          <div className={styles.cut} data-reveal="paste" style={{ "--i": 2 } as CSSProperties}>
            <div className="m-sway">
              <Cutout name="bw" alt={t.alt.cutBw} />
              <span className={`${shared.tape} ${styles.tape}`} aria-hidden="true" />
            </div>
          </div>
        </div>

        <ol className={styles.steps}>
          {t.process.steps.map(([title, body], i) => (
            <li key={title} className={styles.step}>
              <span className={styles.string} data-reveal="draw" style={{ "--i": i * 2 } as CSSProperties} />
              <div data-reveal="rise" style={{ "--i": i * 2 + 1 } as CSSProperties}>
                <p className={`mono ${styles.no}`}>0{i + 1}</p>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.body}>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
