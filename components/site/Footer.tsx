import Link from "next/link";
import { Liquid } from "@/components/motion/graphics/Liquid";
import { siteConfig } from "@/content/site.config";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import styles from "./Footer.module.css";
import { Wordmark } from "./Wordmark";

export function Footer({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <footer data-theme="night" className={styles.footer}>
      <Liquid tone="night" layout="b" />
      <div className={`wrap ${styles.meta}`}>
        <ul className={`mono ${styles.handles}`} aria-label={t.footer.handles}>
          {siteConfig.handles.map(({ handle, href }) => (
            <li key={handle}>
              <a href={href} rel="noopener">
                {handle}
              </a>
            </li>
          ))}
        </ul>
        <Link href={`/${locale}/sessions`} prefetch={false} className={`mono ${styles.login}`}>
          {t.footer.clientLogin}
        </Link>
      </div>
      <div className={styles.giant} data-reveal="rise">
        <Wordmark />
      </div>
      <div className={`wrap mono ${styles.credit}`}>
        <span>© {new Date().getFullYear()} chorro {t.brandLabel}</span>
        <span>{t.footer.credit}</span>
      </div>
    </footer>
  );
}
