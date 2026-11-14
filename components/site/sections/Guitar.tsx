import Image from "next/image";
import type { CSSProperties } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { Cutout } from "../Cutout";
import { Burst, Halftone, Scribble } from "../Sticker";
import styles from "./Guitar.module.css";
import shared from "./sections.module.css";

export function Guitar({ t }: { t: Dictionary }) {
  const photos = [
    { src: "/assets/hands-acoustic.jpg", alt: t.alt.handsAcoustic, w: 528, h: 378 },
    { src: "/assets/lespaul-blur.jpg", alt: t.alt.lespaulBlur, w: 528, h: 653 },
    { src: "/assets/gear-room.jpg", alt: t.alt.gearRoom, w: 528, h: 654 },
    { src: "/assets/bw-live.jpg", alt: t.alt.bwLive, w: 527, h: 593 },
  ];

  return (
    <section id="guitar" className={shared.section}>
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.text}>
          <p className={`mono ${shared.label}`}>{t.guitar.label}</p>
          <h2 className={shared.headline} data-reveal="rise">
            <span className={styles.lead}>
              {t.guitar.headlineLead}
              <Scribble />
            </span>{" "}
            {t.guitar.headlineRest}
          </h2>
          <p className={shared.body} data-reveal="rise" style={{ "--i": 2 } as CSSProperties}>
            {t.guitar.body}
          </p>
        </div>

        {/* photo grid: strict row that runs off the right edge, with Chorro pasted over it */}
        <div className={styles.photos}>
          <Halftone id="ht-guitar" className={styles.dots} />
          <ul className={styles.row} data-reveal="group">
            {photos.map((p, i) => (
              <li key={p.src} style={{ "--i": i * 2 } as CSSProperties}>
                <Image src={p.src} alt={p.alt} width={p.w} height={p.h} sizes="(max-width: 900px) 60vw, 26vw" />
              </li>
            ))}
          </ul>
          <div className={styles.cut} data-reveal="paste" style={{ "--i": 5 } as CSSProperties}>
            <div className="m-sway">
              <Cutout name="strat" alt={t.alt.cutStrat} />
            </div>
          </div>
          <div className={styles.burst} data-reveal="pop" style={{ "--i": 9 } as CSSProperties}>
            <Burst lines={t.guitar.burst} tone="red" />
          </div>
        </div>
      </div>
    </section>
  );
}
