import type { Metadata } from "next";
import styles from "./sessions.module.css";

/** The private side: never indexed, never cached. */
export const metadata: Metadata = {
  title: "Sesiones — Chorro",
  robots: { index: false, follow: false, nocache: true },
};

export default function SessionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="night" className={styles.root}>
      {children}
    </div>
  );
}
