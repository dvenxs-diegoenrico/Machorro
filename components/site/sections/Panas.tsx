"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Words } from "@/components/motion/Words";
import { panas, type Pana } from "@/content/panas";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { VideoEmbed } from "../VideoEmbed";
import styles from "./Panas.module.css";
import shared from "./sections.module.css";
import { Icon } from "@/components/ui/Icon";

const HASH = "#pana-";

/**
 * Panas: the bands and artists Dani has played with, as a lineup of names.
 * A name opens a window with photos, the story in his words, and one video
 * (a tutorial, a live video or a studio clip). Each window has its own link: #pana-<slug>.
 */
export function Panas({ locale, t }: { locale: Locale; t: Dictionary }) {
  const p = t.panas;
  const dialog = useRef<HTMLDialogElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Pana | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const open = useCallback((pana: Pana) => {
    setActive(pana);
    dialog.current?.showModal();
    history.replaceState(null, "", `${HASH}${pana.slug}`);
  }, []);

  const onClose = () => {
    if (location.hash.startsWith(HASH)) history.replaceState(null, "", "#panas");
  };

  // open straight from a shared link
  useEffect(() => {
    const fromHash = () => {
      const slug = location.hash.startsWith(HASH) ? location.hash.slice(HASH.length) : null;
      const pana = slug && panas.find((x) => x.slug === slug);
      if (pana && !dialog.current?.open) open(pana);
    };
    fromHash();
    addEventListener("hashchange", fromHash);
    return () => removeEventListener("hashchange", fromHash);
  }, [open]);

  // the floating photo follows the pointer over the list (desktop only)
  const onMove = (e: React.PointerEvent<HTMLOListElement>) => {
    const el = preview.current;
    if (!el || e.pointerType !== "mouse") return;
    const box = e.currentTarget.getBoundingClientRect();
    el.style.transform = `translate(${e.clientX - box.left}px, ${e.clientY - box.top}px)`;
  };

  return (
    <section id="panas" className={shared.section}>
      <div className="wrap">
        <div className={styles.head}>
          <div>
            <p className={`caps ${shared.label}`} data-reveal="rise">
              {p.label}
            </p>
            <h2 className={styles.title} data-reveal="mask">
              <Words text={p.title} />
              <span className={`mono ${styles.clients}`}>{p.clients}</span>
            </h2>
          </div>
          <p className={styles.intro} data-reveal="rise" style={{ "--i": 1 } as CSSProperties}>
            {p.intro}
          </p>
        </div>

        <div className={styles.listWrap}>
          <ol
            className={styles.list}
            data-reveal="group"
            onPointerMove={onMove}
            onPointerLeave={() => setHovered(null)}
          >
            {panas.map((pana, i) => (
              <li key={pana.slug} style={{ "--i": i } as CSSProperties}>
                <button
                  type="button"
                  className={styles.row}
                  aria-haspopup="dialog"
                  onClick={() => open(pana)}
                  onPointerEnter={() => setHovered(i)}
                  onFocus={() => setHovered(null)}
                >
                  <span className={`mono ${styles.no}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.name}>{pana.name}</span>
                  <span className={`mono ${styles.meta}`}>
                    <span>{pana.role[locale]}</span>
                    {pana.media && <span className={styles.badge}>{p.media[pana.media.type]}</span>}
                  </span>
                  <span className={styles.arrow} aria-hidden="true">
                    <Icon name="arrow-up-right" />
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className={styles.preview} ref={preview} aria-hidden="true">
            {panas.map((pana, i) => (
              <div key={pana.slug} className={styles.previewImg} data-on={hovered === i || undefined}>
                <Image src={pana.photos[0].src} alt="" width={pana.photos[0].width} height={pana.photos[0].height} sizes="260px" />
              </div>
            ))}
          </div>
        </div>

        <p className={`caps ${styles.footnote}`}>{p.footnote}</p>
      </div>

      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="pana-name"
        onClose={onClose}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      >
        {active && (
          <article className={styles.sheet}>
            <header className={styles.sheetHead}>
              <div>
                <p className="caps">
                  {active.role[locale]}
                  {active.years && ` · ${active.years}`}
                </p>
                <h3 id="pana-name" className={styles.sheetName}>
                  {active.name}
                </h3>
              </div>
              <button type="button" className="btn" onClick={() => dialog.current?.close()}>
                {p.close} <Icon name="close" />
              </button>
            </header>

            <ul className={styles.photos} aria-label={p.photos}>
              {active.photos.map((photo, i) => (
                <li key={photo.src + i} style={{ "--i": i } as CSSProperties}>
                  <Image src={photo.src} alt={photo.alt[locale]} width={photo.width} height={photo.height} sizes="(max-width: 720px) 80vw, 420px" />
                </li>
              ))}
            </ul>

            <div className={styles.body}>
              <section aria-labelledby="pana-story">
                <h4 id="pana-story" className={`caps ${styles.subhead}`}>
                  {p.story}
                </h4>
                {active.story[locale].map((para, i) => (
                  <p key={i} className={styles.para}>
                    {para}
                  </p>
                ))}
                {active.press && (
                  <figure className={styles.press}>
                    <blockquote>“{active.press.quote[locale]}”</blockquote>
                    <figcaption className="mono">
                      <a href={active.press.url} rel="noopener" target="_blank">
                        {active.press.source} <Icon name="arrow-up-right" />
                      </a>
                    </figcaption>
                  </figure>
                )}
              </section>

              {active.media && (
                <section aria-labelledby="pana-media">
                  <h4 id="pana-media" className={`caps ${styles.subhead}`}>
                    {p.media[active.media.type]}
                  </h4>
                  <p className={styles.mediaTitle}>{active.media.title[locale]}</p>
                  <VideoEmbed
                    key={active.slug}
                    video={active.media.video}
                    title={active.media.title[locale]}
                    playLabel={p.play}
                    emptyLabel={p.noVideo}
                  />
                  {active.more && (
                    <p className={`mono ${styles.more}`}>
                      {p.more}:{" "}
                      {active.more.map((url, i) => (
                        <a key={url} href={url} rel="noopener" target="_blank">
                          {String(i + 2).padStart(2, "0")} <Icon name="arrow-up-right" />
                        </a>
                      ))}
                    </p>
                  )}
                </section>
              )}
            </div>
          </article>
        )}
      </dialog>
    </section>
  );
}
