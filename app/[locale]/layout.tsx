import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { fontVariables } from "../fonts";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { siteConfig } from "@/content/site.config";
import { isLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    metadataBase: new URL(siteConfig.url),
    title: t.meta.title,
    description: t.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", es: "/es" },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  return (
    <html lang={locale} className={fontVariables}>
      <body>
        <a className="skip mono" href="#main">
          {t.skip}
        </a>
        <Header locale={locale} t={t} />
        <main id="main">{children}</main>
        <Footer locale={locale} t={t} />
      </body>
    </html>
  );
}
