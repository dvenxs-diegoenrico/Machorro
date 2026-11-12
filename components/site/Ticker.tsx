import { siteConfig } from "@/content/site.config";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import styles from "./Ticker.module.css";

/** Slow now-spinning marquee under the header. Content comes from content/site.config.ts. */
export function Ticker({ locale, t }: { locale: Locale; t: Dictionary }) {
  const { nowSpinning, bookingMonth, bookingOpen } = siteConfig;
  const items = [
    `${t.ticker.nowSpinning}: ${nowSpinning.artist[locale]} — ${nowSpinning.song[locale]}`,
    `${t.ticker.booking} ${bookingMonth[locale]}`,
    t.ticker.where,
    t.ticker.vibe,
    bookingOpen ? t.ticker.open : t.ticker.full,
  ];

  const group = (key: string) => (
    <div className={styles.group} key={key}>
      {[0, 1, 2].map((n) =>
        items.map((item, i) => (
          <span key={`${n}-${i}`} className={styles.item}>
            <span className={i === 0 ? styles.dot : styles.sep}>{i === 0 ? "●" : "·"}</span>
            {item}
          </span>
        )),
      )}
    </div>
  );

  return (
    <div className={`mono ${styles.ticker}`}>
      <p className="sr-only">{items.join(" · ")}</p>
      <div className={styles.track} aria-hidden="true">
        {group("a")}
        {group("b")}
      </div>
    </div>
  );
}
