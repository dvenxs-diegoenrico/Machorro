"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Project } from "@/lib/sessions/types";
import { supabase } from "@/lib/supabase/browser";
import styles from "./Panels.module.css";

/** Sign in by email link. `presetEmail` comes from an invite link. */
export function Login({ locale, t, presetEmail, note }: { locale: Locale; t: Dictionary; presetEmail?: string; note?: string }) {
  const p = t.panel;
  const [email, setEmail] = useState(presetEmail ?? "");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const sb = supabase();
    if (!sb) return;
    setState("sending");
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=/${locale}/sessions`, shouldCreateUser: true },
    });
    setState(error ? "error" : "sent");
  };

  return (
    <section className={styles.narrow}>
      <h1 className={styles.h1}>{p.loginTitle}</h1>
      <p className={styles.lead}>{note ?? p.loginBody}</p>
      {state === "sent" ? (
        <p className={styles.ok} role="status">
          {p.checkEmail}
        </p>
      ) : (
        <form className={styles.form} onSubmit={send}>
          <label htmlFor="login-email" className="caps">
            {p.email}
          </label>
          <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className="btn btn-red" disabled={state === "sending"}>
            {state === "sending" ? p.sending : <>{p.sendLink} <Icon name="arrow-right" /></>}
          </button>
          {state === "error" && (
            <p className={styles.err} role="alert">
              {p.loginError}
            </p>
          )}
        </form>
      )}
    </section>
  );
}

/** The panas' home: their sessions. Chorro also gets a link to the producer panel. */
export function SessionsHome({ locale, t }: { locale: Locale; t: Dictionary }) {
  const p = t.panel;
  const [state, setState] = useState<"loading" | "out" | "in">("loading");
  const [isAdmin, setIsAdmin] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    (async () => {
      const { data } = await sb.auth.getUser();
      if (!data.user) return setState("out");
      const [{ data: admin }, { data: rows }] = await Promise.all([
        sb.rpc("is_admin"),
        sb.from("projects").select("id, catalogue_no, artist, title").order("catalogue_no", { ascending: false }),
      ]);
      setIsAdmin(Boolean(admin));
      setProjects(rows ?? []);
      setState("in");
    })();
  }, []);

  if (!supabase()) {
    return (
      <section className={styles.narrow}>
        <h1 className={styles.h1}>{t.console.label}</h1>
        <p className={styles.lead}>{p.notReady}</p>
        <Link href={`/${locale}/sessions/demo`} className="btn btn-red">
          {p.tryDemo} <Icon name="arrow-right" />
        </Link>
      </section>
    );
  }
  if (state === "loading") return <p className={styles.narrow}>…</p>;
  if (state === "out") return <Login locale={locale} t={t} />;

  return (
    <section className={styles.wide}>
      <div className={styles.headRow}>
        <h1 className={styles.h1}>{p.yourSessions}</h1>
        <div className={styles.actions}>
          {isAdmin && (
            <Link href={`/${locale}/sessions/admin`} className="btn btn-red">
              {p.producer} <Icon name="arrow-right" />
            </Link>
          )}
          <SignOut locale={locale} t={t} />
        </div>
      </div>
      {projects.length === 0 ? (
        <p className={styles.lead}>{p.noSessions}</p>
      ) : (
        <ul className={styles.cards}>
          {projects.map((pr) => (
            <li key={pr.id}>
              <Link href={`/${locale}/sessions/p/${pr.id}`} className={styles.card}>
                <span className={`mono ${styles.cat}`}>{pr.catalogue_no}</span>
                <span className={styles.cardTitle}>{pr.title}</span>
                <span className={styles.cardArtist}>{pr.artist}</span>
                <Icon name="arrow-right" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SignOut({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        await supabase()?.auth.signOut();
        location.href = `/${locale}/sessions`;
      }}
    >
      {t.panel.signOut}
    </button>
  );
}

/** /sessions/join/<token>: look up the invited email and pre-fill the login. */
export function Join({ token, locale, t }: { token: string; locale: Locale; t: Dictionary }) {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const sb = supabase();
    if (!sb) return setEmail(null);
    sb.rpc("invite_email", { p_token: token }).then(({ data }) => setEmail((data as string) || null));
  }, [token]);
  if (email === undefined) return <p className={styles.narrow}>…</p>;
  if (email === null) {
    return (
      <section className={styles.narrow}>
        <h1 className={styles.h1}>{t.panel.loginTitle}</h1>
        <p className={styles.lead}>{t.panel.inviteExpired}</p>
      </section>
    );
  }
  return <Login locale={locale} t={t} presetEmail={email} note={t.panel.invited} />;
}
