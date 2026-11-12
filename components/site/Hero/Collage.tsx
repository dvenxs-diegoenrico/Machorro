import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { siteConfig } from "@/content/site.config";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { ticketEdges, tornEdges } from "@/lib/shapes/torn";
import styles from "./Collage.module.css";
import { Parallax } from "./Parallax";

/** Position of a piece inside the collage box. x / y / w are % of the box. */
type Place = {
  x: number;
  y: number;
  w?: number;
  r: number; // resting rotation, deg
  z: number;
  depth: number; // parallax travel, px
  order: number; // drop-in order
  mobile?: { x?: number; y?: number; w?: number };
};

function Piece({
  place,
  className = "",
  children,
}: {
  place: Place;
  className?: string;
  children: ReactNode;
}) {
  const { x, y, w, r, z, depth, order, mobile } = place;
  const style = {
    "--x": `${x}%`,
    "--y": `${y}%`,
    "--w": w ? `${w}%` : "max-content",
    "--r": `${r}deg`,
    "--z": z,
    "--depth": depth,
    "--delay": `${0.25 + order * 0.09}s`,
    "--sway": `${5 + (order % 4) * 0.9}s`,
    ...(mobile?.x !== undefined && { "--xm": `${mobile.x}%` }),
    ...(mobile?.y !== undefined && { "--ym": `${mobile.y}%` }),
    ...(mobile?.w !== undefined && { "--wm": `${mobile.w}%` }),
  } as CSSProperties;

  return (
    <div className={`${styles.piece} ${className}`} style={style}>
      <div className={styles.sway}>
        <div className={styles.lift}>{children}</div>
      </div>
    </div>
  );
}

const SIZES = "(max-width: 900px) 40vw, 20vw";

function TornPhoto({
  src,
  alt,
  width,
  height,
  seed,
  tape,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  seed: number;
  tape: "left" | "center" | "right";
}) {
  return (
    <>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={SIZES}
        className={styles.torn}
        style={{ clipPath: tornEdges(seed) }}
      />
      <span className={`${styles.tape} ${styles[`tape-${tape}`]}`} aria-hidden="true" />
    </>
  );
}

function Art({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) {
  return <Image src={src} alt={alt} width={width} height={height} sizes={SIZES} className={styles.art} />;
}

/** Each ransom letter gets its own cut-out: a look (font + paper) and a tilt. */
const LOOKS = ["serif", "poster", "mono", "varsity", "italic", "inverse", "pool", "red"] as const;
const TILTS = [-6, 4, -2, 7, -4, 3, -7, 5, -3, 6, -5, 2];

function Ransom({ lines }: { lines: readonly string[] }) {
  const longest = Math.max(...lines.map((l) => l.length));
  let n = 0;
  return (
    <h1
      className={styles.ransom}
      aria-label={lines.join(" ")}
      style={{ "--n": longest } as CSSProperties}
    >
      {lines.map((line, li) => (
        <span className={styles.line} key={li} aria-hidden="true">
          {[...line].map((ch) => {
            const i = n++;
            return (
              <span
                key={i}
                className={`${styles.letter} ${styles[`look-${LOOKS[(i * 3 + li) % LOOKS.length]}`]}`}
                style={
                  {
                    "--tilt": `${TILTS[i % TILTS.length]}deg`,
                    "--pop": `${1.25 + i * 0.07}s`,
                  } as CSSProperties
                }
              >
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

function Sticker({ text }: { text: string }) {
  const around = `${text} · `;
  return (
    <svg className={styles.sticker} viewBox="0 0 100 100" role="img" aria-label={text}>
      <circle cx="50" cy="50" r="50" className={styles.stickerDisc} />
      <defs>
        <path id="sticker-ring" d="M50,50 m-35,0 a35,35 0 1,1 70,0 a35,35 0 1,1 -70,0" />
      </defs>
      <g className={styles.stickerSpin}>
        <text className={styles.stickerText} aria-hidden="true">
          <textPath href="#sticker-ring" textLength="218" lengthAdjust="spacing">
            {around}
          </textPath>
        </text>
      </g>
      <circle cx="50" cy="50" r="5" className={styles.stickerDot} />
    </svg>
  );
}

export function Collage({ locale, t }: { locale: Locale; t: Dictionary }) {
  const { nowSpinning, bookingMonth } = siteConfig;
  const a = t.hero.alt;

  return (
    <Parallax className={styles.collage}>
      <Piece place={{ x: 2, y: 1, w: 31, r: -4, z: 2, depth: 10, order: 0 }}>
        <TornPhoto src="/assets/stage-strat.jpg" alt={a.stageStrat} width={527} height={653} seed={11} tape="center" />
      </Piece>

      <Piece place={{ x: 59, y: 3, w: 38, r: 3, z: 2, depth: 14, order: 1 }}>
        <TornPhoto src="/assets/lolla-stage.jpg" alt={a.lollaStage} width={527} height={526} seed={23} tape="right" />
      </Piece>

      <Piece place={{ x: 71, y: 39, w: 27, r: 5, z: 3, depth: 8, order: 2 }}>
        <TornPhoto src="/assets/bw-live.jpg" alt={a.bwLive} width={527} height={593} seed={37} tape="left" />
      </Piece>

      <Piece place={{ x: 40, y: 20, w: 16, r: 6, z: 3, depth: 18, order: 3 }}>
        <Art src="/assets/art-aquiestoy.jpg" alt={a.artAquiEstoy} width={515} height={511} />
      </Piece>

      <Piece place={{ x: 33, y: 69, w: 20, r: 4, z: 4, depth: 12, order: 4 }}>
        <Art src="/assets/art-layitall.jpg" alt={a.artLayItAll} width={527} height={655} />
      </Piece>

      <Piece place={{ x: 80, y: 71, w: 17, r: -5, z: 4, depth: 20, order: 5 }}>
        <Art src="/assets/art-babycomeon.jpg" alt={a.artBabyComeOn} width={432} height={430} />
      </Piece>

      <Piece place={{ x: 36, y: 0, w: 19, r: -8, z: 5, depth: 24, order: 6 }}>
        <div className={styles.patch}>
          <Image src="/assets/elvis-crest.jpg" alt={a.crest} width={1776} height={1667} sizes={SIZES} />
        </div>
      </Piece>

      <Piece
        place={{ x: 2, y: 68, w: 29, r: -3, z: 5, depth: 16, order: 7, mobile: { w: 31, y: 66 } }}
      >
        <p className={styles.note} style={{ clipPath: tornEdges(53, 3) }}>
          {t.hero.note}
        </p>
      </Piece>

      <Piece place={{ x: 55, y: 62, w: 22, r: 0, z: 6, depth: 28, order: 8 }}>
        <Sticker text={`${t.ticker.booking} ${bookingMonth[locale]} · ${t.ticker.where}`} />
      </Piece>

      <Piece place={{ x: 9, y: 36, r: -2, z: 7, depth: 6, order: 9 }} className={styles.headline}>
        <Ransom lines={t.hero.ransom} />
      </Piece>

      <Piece place={{ x: 24, y: 92, r: -2, z: 8, depth: 22, order: 10, mobile: { x: 1 } }}>
        <a className={`mono ${styles.ticket}`} href="#work" style={{ clipPath: ticketEdges() }}>
          <span>
            <span aria-hidden="true">● </span>
            {t.ticker.nowSpinning} — {nowSpinning.artist[locale]} · {nowSpinning.song[locale]}
          </span>
          <span className={styles.stub}>{t.hero.credits} →</span>
        </a>
      </Piece>
    </Parallax>
  );
}
