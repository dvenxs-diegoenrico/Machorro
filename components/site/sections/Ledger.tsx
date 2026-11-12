"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import credits from "@/content/credits.json";
import { siteConfig } from "@/content/site.config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import styles from "./Ledger.module.css";
import shared from "./sections.module.css";

const ROLES = ["all", "gtr", "prod", "bass", "keys"] as const;
type Role = (typeof ROLES)[number];

/** Credits treated as data: catalogue numbers, filter chips, one row per song. */
export function Ledger({ t, artAlt }: { t: Dictionary; artAlt: Record<string, string> }) {
  const [role, setRole] = useState<Role>("all");
  const rows = credits.filter((c) => role === "all" || c.roles.includes(role));
  const c = t.ledger.cols;

  return (
    <section id="work" className={shared.section}>
      <div className="wrap">
        <div className={styles.head}>
          <div>
            <p className={`mono ${shared.label}`}>{t.ledger.label}</p>
            <h2 className={shared.headline} data-reveal="rise">
              {t.ledger.headline}
            </h2>
          </div>
          <div className={styles.chips} role="group" aria-label={t.ledger.filterLabel}>
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                className={`pill ${styles.chip}`}
                aria-pressed={role === r}
                onClick={() => setRole(r)}
              >
                {t.ledger.chips[r]}
              </button>
            ))}
          </div>
        </div>

        <div data-reveal="rise" style={{ "--i": 1 } as CSSProperties}>
          <table className={styles.table}>
            <caption className="sr-only">{t.ledger.caption}</caption>
            <thead className="mono">
              <tr>
                <th scope="col"><span className="sr-only">{c.art}</span></th>
                <th scope="col">{c.cat}</th>
                <th scope="col">{c.year}</th>
                <th scope="col">{c.artist}</th>
                <th scope="col">{c.title}</th>
                <th scope="col">{c.role}</th>
                <th scope="col">{c.listen}</th>
              </tr>
            </thead>
            {/* keyed by filter so the rows deal back in when it changes */}
            <tbody key={role}>
              {rows.map((row, i) => (
                <tr key={row.cat} className={styles.row} style={{ "--i": i } as CSSProperties}>
                  <td className={styles.art}>
                    <Image src={row.art} alt={artAlt[row.cat] ?? ""} width={96} height={96} />
                  </td>
                  <td className={`mono ${styles.cat}`}>{row.cat}</td>
                  <td className={`mono ${styles.year}`}>{row.year}</td>
                  <td className={styles.artist}>{row.artist}</td>
                  <td className={styles.title}>{row.title}</td>
                  <td className={`mono ${styles.roles}`}>
                    {row.roles.map((r) => t.ledger.chips[r as Role]).join(" · ")}
                  </td>
                  <td className={`mono ${styles.listen}`}>
                    {row.listen ? (
                      <a href={row.listen} rel="noopener">
                        {t.ledger.listen}
                      </a>
                    ) : (
                      t.ledger.noLink
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className={`mono ${styles.empty}`}>{t.ledger.empty}</p>}
        </div>

        <p className={`mono ${styles.muso}`}>
          {siteConfig.musoUrl ? (
            <a href={siteConfig.musoUrl} rel="noopener">
              {t.ledger.muso}
            </a>
          ) : (
            <>{t.ledger.muso} [muso.ai url]</>
          )}
        </p>
      </div>
    </section>
  );
}
