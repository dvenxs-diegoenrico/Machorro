import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import styles from "./Header.module.css";
import { LocaleSwitch } from "./LocaleSwitch";

/** Sits over the hero photo: links left, his name in the middle, book on the right. */
export function Header({ locale, t }: { locale: Locale; t: Dictionary }) {
  const home = `/${locale}`;
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <nav aria-label={t.nav.label} className={styles.nav}>
          <ul className="caps">
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
              <Link href={`${home}/sessions`} prefetch={false}>
                {t.nav.panas}
              </Link>
            </li>
          </ul>
        </nav>
        <Link href={home} className={styles.name}>
          {t.hero.name}
        </Link>
        <div className={styles.end}>
          <LocaleSwitch locale={locale} label={t.localeSwitch} />
          <Link href={`${home}#book`} className={`btn ${styles.book}`}>
            {t.nav.book}
          </Link>
        </div>
      </div>
    </header>
  );
}
