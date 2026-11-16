import { notFound } from "next/navigation";
import { ProjectAdmin } from "@/components/console/Producer";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

/** One project: versions, uploads, who can listen, invite links, listens. */
export default async function Page({ params }: PageProps<"/[locale]/sessions/admin/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  return <ProjectAdmin id={id} locale={locale} t={getDictionary(locale)} />;
}
