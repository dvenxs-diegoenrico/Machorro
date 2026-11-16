import { notFound } from "next/navigation";
import { Join } from "@/components/console/Panels";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

/** An invite link: pre-fills the pana's email on the login. */
export default async function Page({ params }: PageProps<"/[locale]/sessions/join/[token]">) {
  const { locale, token } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/.test(token)) notFound();
  return <Join token={token} locale={locale} t={getDictionary(locale)} />;
}
