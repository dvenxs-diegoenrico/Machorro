import { notFound } from "next/navigation";
import { ProducerHome } from "@/components/console/Producer";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

/** Chorro's panel: projects and panas. */
export default async function Page({ params }: PageProps<"/[locale]/sessions/admin">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ProducerHome locale={locale} t={getDictionary(locale)} />;
}
