import { notFound } from "next/navigation";
import { MasterControl } from "@/components/console/Master";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

/** The owner's read-only overview. Everything on it comes from one database function that checks the owner. */
export default async function Page({ params }: PageProps<"/[locale]/sessions/master">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <MasterControl locale={locale} t={getDictionary(locale)} />;
}
