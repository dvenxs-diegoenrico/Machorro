"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Drives the hero's three planes. Sets on its box:
 *   --mx / --my  pointer position, −1…1 (desktop pointers only)
 *   --sy         how far the page has scrolled, in px
 * Each plane multiplies those by its own depth in CSS. Off under prefers-reduced-motion.
 */
export function Parallax({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const onMove = (e: PointerEvent) => {
      if (!fine.matches || reduced.matches) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const mx = ((e.clientX - r.left) / r.width) * 2 - 1;
        const my = ((e.clientY - r.top) / r.height) * 2 - 1;
        el.style.setProperty("--mx", Math.max(-1, Math.min(1, mx)).toFixed(3));
        el.style.setProperty("--my", Math.max(-1, Math.min(1, my)).toFixed(3));
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty("--mx", "0");
      el.style.setProperty("--my", "0");
    };
    const onScroll = () => {
      if (reduced.matches) return;
      el.style.setProperty("--sy", String(Math.min(window.scrollY, 1200)));
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
