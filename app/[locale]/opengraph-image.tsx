import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { isLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export const alt = "chorro & elvis cave";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/** Instrument Serif from Google Fonts, as TTF. Falls back to the default face if it can't be fetched. */
async function serif(italic: boolean): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@${italic ? 1 : 0}`,
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    return url ? await fetch(url).then((r) => r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "en");
  const [cover, regular, italic] = await Promise.all([
    readFile(path.join(process.cwd(), "public/assets/cover-elvis.jpg")),
    serif(false),
    serif(true),
  ]);
  const fonts = [
    regular && { name: "Serif", data: regular, style: "normal" as const, weight: 400 as const },
    italic && { name: "Serif", data: italic, style: "italic" as const, weight: 400 as const },
  ].filter((f): f is NonNullable<typeof f> => Boolean(f));

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#eaeaea", color: "#0f382a", fontFamily: "Serif" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/jpeg;base64,${cover.toString("base64")}`} alt="" width={540} height={580} style={{ margin: "25px 0 25px 30px", objectFit: "contain" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 56px 56px 40px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 64, fontStyle: "italic" }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#c8102e", marginRight: 12, marginTop: 14 }} />
            chorro
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 84, lineHeight: 1 }}>
            <div>{t.guitar.headlineLead}</div>
            <div style={{ fontSize: 44, lineHeight: 1.1, marginTop: 18, color: "#4d6158" }}>{t.guitar.headlineRest}</div>
          </div>
          <div style={{ display: "flex", background: "#e60067", color: "#ffffff", fontSize: 26, padding: "10px 20px", borderRadius: 999, alignSelf: "flex-start" }}>
            {t.ticker.vibe}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
