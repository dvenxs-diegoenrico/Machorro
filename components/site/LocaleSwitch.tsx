"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n/config";
import styles from "./LocaleSwitch.module.css";

/** en / es — keeps you on the same page in the other language. */
export function LocaleSwitch({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const rest = pathname.replace(/^\/(en|es)(?=\/|$)/, "");

  return (
    <nav aria-label={label} className={styles.switch}>
      {locales.map((l, i) => (
        <span key={l}>
          {i > 0 && <span aria-hidden="true">/</span>}
          <Link
            href={`/${l}${rest}`}
            hrefLang={l}
            lang={l}
            aria-current={l === locale ? "true" : undefined}
          >
            {l}
          </Link>
        </span>
      ))}
    </nav>
  );
}
