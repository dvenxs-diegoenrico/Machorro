"use client";

import { useState, type FormEvent } from "react";
import { Equalizer } from "@/components/motion/graphics/Equalizer";
import { siteConfig } from "@/content/site.config";
import type { Locale } from "@/lib/i18n/config";
import { Words } from "@/components/motion/Words";
import type { Dictionary } from "@/lib/i18n/dictionary";
import styles from "./Booking.module.css";
import shared from "./sections.module.css";

type State = "idle" | "sending" | "sent" | "error" | "not_configured";

export function Booking({ locale, t }: { locale: Locale; t: Dictionary }) {
  const [state, setState] = useState<State>("idle");
  const b = t.book;
  const f = b.fields;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState("sending");
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), locale }),
      });
      if (res.ok) {
        form.reset();
        setState("sent");
      } else {
        setState(res.status === 503 ? "not_configured" : "error");
      }
    } catch {
      setState("error");
    }
  }

  const message =
    state === "sent" ? b.success : state === "error" ? b.error : state === "not_configured" ? b.notConfigured : "";

  return (
    <section id="book" className={shared.section}>
      <div className={`wrap ${styles.grid}`}>
        <div>
          <p className={`caps ${shared.label}`} data-reveal="rise">{b.label}</p>
          <h2 className={shared.headline} data-reveal="mask">
            <Words text={b.headline} />
          </h2>
          <p className={shared.body} data-reveal="rise" style={{ "--i": 1 } as React.CSSProperties}>
            {b.intro}
          </p>
          <p className={`mono ${styles.status}`} data-reveal="rise" style={{ "--i": 2 } as React.CSSProperties}>
            <Equalizer bars={5} className={styles.eq} />
            {siteConfig.bookingOpen ? t.ticker.open : t.ticker.full}
          </p>
        </div>

        <form className={styles.form} onSubmit={onSubmit} data-reveal="rise">
          <div className={styles.pair}>
            <label className={styles.field}>
              <span className="mono">{f.name}</span>
              <input name="name" type="text" required autoComplete="name" maxLength={120} />
            </label>
            <label className={styles.field}>
              <span className="mono">{f.email}</span>
              <input name="email" type="email" required autoComplete="email" maxLength={200} />
            </label>
          </div>
          <label className={styles.field}>
            <span className="mono">{f.link}</span>
            <input name="link" type="url" inputMode="url" placeholder="https://" maxLength={500} aria-describedby="link-hint" />
            <small id="link-hint" className="mono">
              {f.linkHint}
            </small>
          </label>
          <div className={styles.pair}>
            <label className={styles.field}>
              <span className="mono">{f.need}</span>
              <select name="need" defaultValue={b.needs[0]}>
                {b.needs.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className="mono">{f.budget}</span>
              <input name="budget" type="text" maxLength={80} aria-describedby="budget-hint" />
              <small id="budget-hint" className="mono">
                {f.budgetHint}
              </small>
            </label>
          </div>
          <label className={styles.field}>
            <span className="mono">{f.message}</span>
            <textarea name="message" rows={4} maxLength={4000} />
          </label>
          {/* honeypot: people never see or fill this */}
          <input name="company" type="text" tabIndex={-1} autoComplete="off" className={styles.trap} aria-hidden="true" />

          <div className={styles.actions}>
            <button type="submit" className="btn btn-red" disabled={state === "sending"}>
              {state === "sending" ? b.sending : b.send}
            </button>
            <p role="status" aria-live="polite" className={`${styles.message} ${state === "sent" ? styles.ok : ""}`}>
              {message}
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
