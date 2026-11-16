import { notFound } from "next/navigation";
import { DemoConsole } from "@/components/console/Wrappers";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

/** Try the console with a generated session. No account, nothing uploaded. */
export default async function DemoPage({ params }: PageProps<"/[locale]/sessions/demo">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <DemoConsole locale={locale} t={getDictionary(locale)} />;
}
