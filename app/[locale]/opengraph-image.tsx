import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { isLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export const alt = "Daniel Chorro Machorro";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/** Archivo Black-ish weight from Google Fonts (TTF). Falls back to the default face. */
async function display(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch("https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@700").then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    return url ? await fetch(url).then((r) => r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** The hero, as a share card: his stage photo, the haze, CHORRO across the bottom. */
export default async function OgImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "en");
  const [photo, font] = await Promise.all([
    readFile(path.join(process.cwd(), "public/assets/hero-stage.jpg")),
    display(),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#efebdd", color: "#2e310d", fontFamily: "Display" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/jpeg;base64,${photo.toString("base64")}`}
          alt=""
          width={1200}
          height={1800}
          style={{ position: "absolute", left: 0, top: -330, width: 1200, height: 1800, objectFit: "cover" }}
        />
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(to top, rgba(239,235,221,0.7), rgba(239,235,221,0) 55%)" }} />
        <div style={{ position: "absolute", left: 40, right: 40, top: 30, display: "flex", justifyContent: "center", fontSize: 40, textTransform: "uppercase" }}>
          {t.hero.name}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: -40, display: "flex", justifyContent: "center", fontSize: 330, lineHeight: 1, textTransform: "uppercase", letterSpacing: -4 }}>
          {t.hero.word}
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Display", data: font, style: "normal", weight: 700 }] : undefined },
  );
}
