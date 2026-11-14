import { notFound } from "next/navigation";
import { Hero } from "@/components/site/Hero/Hero";
import { Ticker } from "@/components/site/Ticker";
import { SixStringRule } from "@/components/site/SixStringRule";
import { Booking } from "@/components/site/sections/Booking";
import { Cave } from "@/components/site/sections/Cave";
import { Guitar } from "@/components/site/sections/Guitar";
import { Ledger } from "@/components/site/sections/Ledger";
import { Panas } from "@/components/site/sections/Panas";
import { Process } from "@/components/site/sections/Process";
import { Sessions } from "@/components/site/sections/Sessions";
import { Statement } from "@/components/site/sections/Statement";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const artAlt = {
    "chr-001": t.alt.artLayItAll,
    "chr-002": t.alt.artSerDeMi,
    "chr-003": t.alt.artBabyComeOn,
    "chr-004": t.alt.artAquiEstoy,
  };

  const Rule = ({ hint }: { hint?: boolean }) => (
    <div className="wrap">
      <SixStringRule hint={hint ? t.strings.hint : undefined} />
    </div>
  );

  return (
    <>
      <Hero t={t} />
      <Ticker locale={locale} t={t} />
      <Guitar t={t} />
      <Rule hint />
      <Ledger t={t} artAlt={artAlt} />
      <Panas locale={locale} t={t} />
      <Statement t={t} />
      <Sessions locale={locale} t={t} />
      <Cave locale={locale} t={t} />
      <Process t={t} />
      <Rule />
      <Booking locale={locale} t={t} />
      <Rule />
    </>
  );
}
