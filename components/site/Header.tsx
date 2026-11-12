import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import styles from "./Header.module.css";
import { LocaleSwitch } from "./LocaleSwitch";
import { Ticker } from "./Ticker";
import { Wordmark } from "./Wordmark";

export function Header({ locale, t }: { locale: Locale; t: Dictionary }) {
  const home = `/${locale}`;
  return (
    <header data-theme="night" className={styles.header}>
      <div className={`wrap ${styles.bar}`}>
        <div className={styles.brand}>
          <Link href={home} className={styles.home} aria-label="chorro">
            <Wordmark />
          </Link>
          <span className={`mono ${styles.label}`}>{t.brandLabel}</span>
        </div>
        <nav aria-label={t.nav.label} className={styles.nav}>
          <ul className="mono">
            <li>
              <Link href={`${home}#work`}>{t.nav.work}</Link>
            </li>
            <li>
              <Link href={`${home}#sessions`}>{t.nav.sessions}</Link>
            </li>
            <li>
              <Link href={`${home}#elvis-cave`}>{t.nav.cave}</Link>
            </li>
            <li>
              <Link href={`${home}#book`} className={`pill pill-red ${styles.book}`}>
                {t.nav.book}
              </Link>
            </li>
          </ul>
        </nav>
        <LocaleSwitch locale={locale} label={t.localeSwitch} />
      </div>
      <Ticker locale={locale} t={t} />
    </header>
  );
}
