import { notFound } from "next/navigation";
import { SessionConsole } from "@/components/console/Wrappers";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

/** One session in the console. Row-level security decides who gets anything back. */
export default async function Page({ params }: PageProps<"/[locale]/sessions/p/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  return <SessionConsole id={id} locale={locale} t={getDictionary(locale)} />;
}
