"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { Vinyl } from "@/components/motion/graphics/Vinyl";
import { Words } from "@/components/motion/Words";
import credits from "@/content/credits.json";
import { moreArtists } from "@/content/credits.more";
import { siteConfig } from "@/content/site.config";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import styles from "./Ledger.module.css";
import shared from "./sections.module.css";

const ROLES = ["all", "gtr", "prod", "comp", "mix", "eng"] as const;
type Role = (typeof ROLES)[number];
/** rows on the home page */
const PREVIEW = 8;

/**
 * Credits treated as data: catalogue numbers, one row per song, most played first.
 * "preview" (home page): the top rows and a link to the credits page.
 * "full" (credits page): every row, with role filters and the list of more artists.
 */
export function Ledger({ t, locale, variant = "preview" }: { t: Dictionary; locale: Locale; variant?: "preview" | "full" }) {
  const full = variant === "full";
  const [role, setRole] = useState<Role>("all");
  const matched = credits.filter((c) => role === "all" || c.roles.includes(role));
  const rows = full ? matched : matched.slice(0, PREVIEW);
  const Heading = full ? "h1" : "h2";
  // on the credits page the top of the page is there at once; reveals are for scrolling into
  const reveal = (kind: string) => (full ? undefined : kind);
  const hasLinks = credits.some((c) => c.listen);
  const c = t.ledger.cols;
  const l = t.ledger;

  return (
    <section id={full ? "credits" : "work"} className={`${shared.section} ${full ? styles.fullPage : ""}`}>
      <div className="wrap">
        <div className={styles.head}>
          <div>
            <p className={`caps ${shared.label}`} data-reveal={reveal("rise")}>
              {l.label}
            </p>
            <Heading className={shared.headline} data-reveal={reveal("mask")}>
              <Words text={l.headline} />
            </Heading>
            <p className={styles.sub} data-reveal={reveal("rise")}>
              {l.sub}
            </p>
          </div>
          <div className={styles.vinyl} data-reveal={reveal("slide-right")}>
            <Vinyl label={rows[0]?.cat ?? "chr"} />
          </div>
          {full && (
          <div className={styles.chips} role="group" aria-label={l.filterLabel}>
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                className={`btn ${styles.chip}`}
                aria-pressed={role === r}
                onClick={() => setRole(r)}
              >
                {l.chips[r]}
              </button>
            ))}
          </div>
          )}
        </div>

        <div data-reveal="rows">
          <table className={styles.table}>
            <caption className="sr-only">{l.caption}</caption>
            <thead className="mono">
              <tr>
                <th scope="col">
                  <span className="sr-only">{c.art}</span>
                </th>
                <th scope="col">{c.cat}</th>
                <th scope="col">{c.year}</th>
                <th scope="col">{c.artist}</th>
                <th scope="col">{c.title}</th>
                <th scope="col">{c.role}</th>
                {hasLinks && <th scope="col">{c.listen}</th>}
              </tr>
            </thead>
            {/* keyed by filter so the rows deal back in when it changes */}
            <tbody key={role}>
              {rows.map((row, i) => (
                <tr key={row.cat} className={styles.row} style={{ "--i": i } as CSSProperties}>
                  <td className={styles.art}>
                    {row.art ? (
                      <Image
                        src={row.art}
                        alt={l.coverAlt.replace("{title}", row.title).replace("{artist}", row.artist)}
                        width={96}
                        height={96}
                      />
                    ) : (
                      <span className={styles.noArt} aria-hidden="true">
                        {row.title.charAt(0)}
                      </span>
                    )}
                  </td>
                  <td className={`mono ${styles.cat}`}>{row.cat}</td>
                  <td className={`mono ${styles.year}`}>{row.year}</td>
                  <td className={styles.artist}>{row.artist}</td>
                  <td className={styles.title}>{row.title}</td>
                  <td className={`mono ${styles.roles}`}>
                    {row.roles.map((r) => l.chips[r as Role]).join(" · ")}
                  </td>
                  {hasLinks && (
                    <td className={`mono ${styles.listen}`}>
                      {row.listen && (
                        <a href={row.listen} rel="noopener">
                          {l.listen}
                        </a>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {matched.length === 0 && <p className={`mono ${styles.empty}`}>{l.empty}</p>}
        </div>

        {!full && (
          <Link href={`/${locale}/credits`} className={`btn btn-red ${styles.more}`}>
            {l.seeMore}
          </Link>
        )}

        {full && (
          <p className={styles.also}>
            <span className="caps">{l.alsoWith}</span> {moreArtists.join(" · ")}
          </p>
        )}

        {siteConfig.musoUrl && (
          <p className={`mono ${styles.muso}`}>
            <a href={siteConfig.musoUrl} rel="noopener">
              {l.muso}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
