import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Ledger } from "@/components/site/sections/Ledger";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export async function generateMetadata({ params }: PageProps<"/[locale]/credits">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: t.ledger.pageTitle,
    description: t.ledger.pageDescription,
    alternates: { canonical: `/${locale}/credits`, languages: { en: "/en/credits", es: "/es/credits" } },
  };
}

/** Every credit, with role filters. The home page shows only the top of this list. */
export default async function CreditsPage({ params }: PageProps<"/[locale]/credits">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  return <Ledger t={t} locale={locale} variant="full" />;
}
