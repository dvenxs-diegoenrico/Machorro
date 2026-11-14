import Image from "next/image";
import type { CSSProperties } from "react";
import { Words } from "@/components/motion/Words";
import type { Dictionary } from "@/lib/i18n/dictionary";
import styles from "./Guitar.module.css";
import shared from "./sections.module.css";

export function Guitar({ t }: { t: Dictionary }) {
  const photos = [
    { src: "/assets/hands-acoustic.jpg", alt: t.alt.handsAcoustic, w: 528, h: 378 },
    { src: "/assets/lespaul-blur.jpg", alt: t.alt.lespaulBlur, w: 528, h: 653 },
    { src: "/assets/stage-strat.jpg", alt: t.alt.stageStrat, w: 527, h: 653 },
    { src: "/assets/bw-live.jpg", alt: t.alt.bwLive, w: 527, h: 593 },
  ];

  return (
    <section id="guitar" className={shared.section}>
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.text}>
          <p className={`caps ${shared.label}`} data-reveal="rise">{t.guitar.label}</p>
          <h2 className={shared.headline} data-reveal="mask">
            <Words text={t.guitar.headlineLead} />{" "}
            <span className={styles.rest}>
              <Words text={t.guitar.headlineRest} from={t.guitar.headlineLead.split(" ").length} />
            </span>
          </h2>
          <p className={shared.body} data-reveal="rise" style={{ "--i": 2 } as CSSProperties}>
            {t.guitar.body}
          </p>
        </div>

        {/* a strict row of photos that runs off the right edge */}
        <ul className={`${styles.row} m-drift-in`} data-reveal="wipe">
          {photos.map((p, i) => (
            <li key={p.src} style={{ "--i": i * 2 } as CSSProperties}>
              <Image src={p.src} alt={p.alt} width={p.w} height={p.h} sizes="(max-width: 900px) 60vw, 26vw" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
