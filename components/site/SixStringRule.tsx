"use client";

import { useEffect, useRef } from "react";
import { isUnlocked, pluck, STANDARD_TUNING, unlock } from "@/lib/audio/pluck";
import styles from "./SixStringRule.module.css";

const REST = "M0 8 L1000 8";
const STRINGS = [0, 1, 2, 3, 4, 5]; // top (thick, low E) to bottom (thin, high E)

type Ring = { amp: number; at: number; start: number; hz: number; tau: number };

/**
 * Section divider: six strings, thick to thin, that you can play.
 * Run the pointer across them and each one bends where you crossed it and rings out.
 * Tap or click a string to hear it (standard tuning); after that, strumming sounds too.
 * They strum themselves once when they scroll into view. Decorative for assistive tech.
 */
export function SixStringRule({ hint }: { hint?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const paths = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rings = new Map<number, Ring>();
    let frame = 0;
    let lastY: number | null = null;
    let lastT = 0;
    const lastHit = new Array(6).fill(0); // a string can't be re-struck within 90ms

    const draw = (now: number) => {
      for (const [i, r] of rings) {
        const t = (now - r.start) / 1000;
        const env = Math.exp(-t / r.tau);
        const p = paths.current[i];
        if (!p) continue;
        if (env < 0.06) {
          p.setAttribute("d", REST);
          rings.delete(i);
          continue;
        }
        const y = 8 + 2 * r.amp * env * Math.cos(2 * Math.PI * r.hz * t);
        p.setAttribute("d", `M0 8 Q${(r.at * 1000).toFixed(1)} ${y.toFixed(2)} 1000 8`);
      }
      frame = rings.size ? requestAnimationFrame(draw) : 0;
    };

    const ring = (i: number, at: number, strength: number) => {
      if (!still) {
        rings.set(i, {
          amp: 3.2 * Math.min(1, strength),
          at: Math.min(0.92, Math.max(0.08, at)),
          start: performance.now(),
          hz: 6.5 + i * 1.4, // thick strings wobble slower
          tau: 0.55 + (5 - i) * 0.09, // and ring longer
        });
        if (!frame) frame = requestAnimationFrame(draw);
      }
    };

    const sound = (i: number, at: number, velocity: number) => {
      pluck(STANDARD_TUNING[i], velocity, (at - 0.5) * 1.2);
    };

    // y-centre of each string, relative to the rule
    const centres = () => {
      const top = el.getBoundingClientRect().top;
      return paths.current.map((p) => {
        const r = p?.ownerSVGElement?.getBoundingClientRect();
        return r ? r.top - top + r.height / 2 : 0;
      });
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // on touch the page scrolls; tap to play
      const box = el.getBoundingClientRect();
      const y = e.clientY - box.top;
      const at = (e.clientX - box.left) / box.width;
      const now = performance.now();
      if (lastY !== null) {
        const speed = Math.abs(y - lastY) / Math.max(8, now - lastT); // px per ms
        centres().forEach((c, i) => {
          if ((lastY! - c) * (y - c) <= 0 && lastY !== y && now - lastHit[i] > 90) {
            lastHit[i] = now;
            ring(i, at, 0.45 + speed * 0.9);
            if (isUnlocked()) sound(i, at, 0.25 + Math.min(0.35, speed * 0.4));
          }
        });
      }
      lastY = y;
      lastT = now;
    };

    const onLeave = () => {
      lastY = null;
    };

    const onDown = async (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      const y = e.clientY - box.top;
      const at = (e.clientX - box.left) / box.width;
      const c = centres();
      const i = c.reduce((best, cy, k) => (Math.abs(cy - y) < Math.abs(c[best] - y) ? k : best), 0);
      ring(i, at, 1);
      if (await unlock()) sound(i, at, 0.8);
    };

    // strum once, top to bottom, the first time the strings scroll into view
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        STRINGS.forEach((i) => setTimeout(() => ring(i, 0.35 + i * 0.05, 0.7), 120 + i * 55));
      },
      { threshold: 0.6 },
    );
    io.observe(el);

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <div className={styles.rule} ref={root} aria-hidden="true">
      {STRINGS.map((i) => (
        <svg key={i} className={styles.string} viewBox="0 0 1000 16" preserveAspectRatio="none">
          <path
            ref={(p) => {
              paths.current[i] = p;
            }}
            d={REST}
          />
        </svg>
      ))}
      {hint && <span className={`caps ${styles.hint}`}>{hint}</span>}
    </div>
  );
}
