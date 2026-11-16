import Image from "next/image";
import type { CSSProperties } from "react";
import { Words } from "@/components/motion/Words";
import type { Dictionary } from "@/lib/i18n/dictionary";
import styles from "./Guitar.module.css";
import shared from "./sections.module.css";

export function Guitar({ t }: { t: Dictionary }) {
  const photos = [
    { src: "/assets/live/live-01.jpg", alt: t.alt.live01, w: 724, h: 1086 },
    { src: "/assets/studio/studio-02.jpg", alt: t.alt.session01, w: 768, h: 1024 },
    { src: "/assets/live/live-02.jpg", alt: t.alt.live02, w: 724, h: 1086 },
    { src: "/assets/live/live-03.jpg", alt: t.alt.live03, w: 724, h: 1086 },
    { src: "/assets/studio/studio-03.jpg", alt: t.alt.session02, w: 768, h: 1024 },
    { src: "/assets/live/live-04.jpg", alt: t.alt.live04, w: 724, h: 1086 },
    { src: "/assets/live/live-05.jpg", alt: t.alt.live05, w: 768, h: 1024 },
    { src: "/assets/live/live-06.jpg", alt: t.alt.live06, w: 724, h: 1086 },
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
          <p className={`mono ${styles.school}`} data-reveal="rise" style={{ "--i": 3 } as CSSProperties}>
            {t.guitar.school}
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
