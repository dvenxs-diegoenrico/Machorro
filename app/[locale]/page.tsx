import { notFound } from "next/navigation";
import { SixStringRule } from "@/components/site/SixStringRule";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import styles from "./page.module.css";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  return (
    <>
      {/* Phase 1a opening. The cover + collage hero replaces this in 1b. */}
      <section className={styles.opening}>
        <div className="wrap">
          <h1 className={styles.headline}>{t.opening.headline}</h1>
          <div className={styles.ctas}>
            <a className="pill pill-red" href="#book">
              {t.opening.book}
            </a>
            <a className="pill" href="#work">
              {t.opening.hear}
            </a>
          </div>
        </div>
      </section>
      <div className="wrap">
        <SixStringRule />
      </div>
    </>
  );
}
