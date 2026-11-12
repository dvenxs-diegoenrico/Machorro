import Image from "next/image";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { Collage } from "./Collage";
import styles from "./Hero.module.css";

export function Hero({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <section className={styles.hero}>
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.cover}>
          <Image
            src="/assets/cover-elvis.jpg"
            alt={t.hero.alt.cover}
            width={1014}
            height={1089}
            priority
            sizes="(max-width: 900px) 100vw, 50vw"
          />
        </div>
        <Collage locale={locale} t={t} />
      </div>
      <div className={`wrap ${styles.ctas}`}>
        <a className="pill pill-red" href="#book">
          {t.hero.book}
        </a>
        <a className="pill" href="#work">
          {t.hero.hear}
        </a>
      </div>
    </section>
  );
}
