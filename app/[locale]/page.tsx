import { notFound } from "next/navigation";
import { Hero } from "@/components/site/Hero/Hero";
import { SixStringRule } from "@/components/site/SixStringRule";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  return (
    <>
      <Hero locale={locale} t={t} />
      <div className="wrap">
        <SixStringRule />
      </div>
    </>
  );
}
