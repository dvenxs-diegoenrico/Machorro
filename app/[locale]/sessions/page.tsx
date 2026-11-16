import { notFound } from "next/navigation";
import { SessionsHome } from "@/components/console/Panels";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

/** Panas sign in here and see their sessions. */
export default async function Page({ params }: PageProps<"/[locale]/sessions">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <SessionsHome locale={locale} t={getDictionary(locale)} />;
}
