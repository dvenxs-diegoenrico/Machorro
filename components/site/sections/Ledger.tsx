"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { Vinyl } from "@/components/motion/graphics/Vinyl";
import { Words } from "@/components/motion/Words";
import credits from "@/content/credits.json";
import { moreArtists } from "@/content/credits.more";
import { siteConfig } from "@/content/site.config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import styles from "./Ledger.module.css";
import shared from "./sections.module.css";

const ROLES = ["all", "gtr", "prod", "comp", "mix", "eng"] as const;
type Role = (typeof ROLES)[number];
/** rows shown before "show all" */
const FIRST = 10;

/** Credits treated as data: catalogue numbers, filter chips, one row per song, most played first. */
export function Ledger({ t }: { t: Dictionary }) {
  const [role, setRole] = useState<Role>("all");
  const [all, setAll] = useState(false);
  const matched = credits.filter((c) => role === "all" || c.roles.includes(role));
  const rows = all ? matched : matched.slice(0, FIRST);
  const hasLinks = credits.some((c) => c.listen);
  const c = t.ledger.cols;
  const l = t.ledger;

  return (
    <section id="work" className={shared.section}>
      <div className="wrap">
        <div className={styles.head}>
          <div>
            <p className={`caps ${shared.label}`} data-reveal="rise">
              {l.label}
            </p>
            <h2 className={shared.headline} data-reveal="mask">
              <Words text={l.headline} />
            </h2>
            <p className={styles.sub} data-reveal="rise">
              {l.sub}
            </p>
          </div>
          <div className={styles.vinyl} data-reveal="slide-right">
            <Vinyl label={rows[0]?.cat ?? "chr"} />
          </div>
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
            <tbody key={role + String(all)}>
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

        {matched.length > FIRST && (
          <button type="button" className={`btn ${styles.more}`} onClick={() => setAll(!all)} aria-expanded={all}>
            {all ? l.showLess : l.showAll.replace("{n}", String(matched.length))}
          </button>
        )}

        <p className={styles.also}>
          <span className="caps">{l.alsoWith}</span> {moreArtists.join(" · ")}
        </p>

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
