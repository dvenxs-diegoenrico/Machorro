import type { CSSProperties } from "react";

type Tone = "sand" | "paper" | "pop" | "night";

/** Blob layouts: [x%, y%, size (vw), seconds, drift x (vw), drift y (vw)] */
const LAYOUTS: Record<string, number[][]> = {
  a: [
    [-8, -20, 38, 16, 8, 6],
    [62, 48, 44, 21, -9, -7],
    [30, 70, 26, 13, 7, -9],
    [78, -12, 24, 18, -6, 8],
  ],
  b: [
    [58, -24, 42, 19, -8, 7],
    [-12, 40, 40, 15, 9, -6],
    [40, 62, 30, 22, -7, -8],
  ],
  c: [
    [20, -30, 46, 20, 7, 8],
    [70, 30, 34, 14, -8, 6],
    [-10, 60, 32, 17, 8, -7],
    [50, 78, 22, 12, -6, -6],
  ],
};

/**
 * Liquid in the blank space: slow blobs in two shades of the section's own colour.
 * Put it first inside a section that has `isolation: isolate`. Decorative.
 */
export function Liquid({ tone, layout = "a" }: { tone: Tone; layout?: keyof typeof LAYOUTS }) {
  return (
    <div className="liquid" data-tone={tone} aria-hidden="true">
      {LAYOUTS[layout].map(([x, y, s, t, dx, dy], i) => (
        <span
          key={i}
          style={
            {
              "--x": `${x}%`,
              "--y": `${y}%`,
              "--s": `max(${s}vw, ${s * 4}px)`,
              "--t": `${t}s`,
              "--dx": `${dx}vw`,
              "--dy": `${dy}vw`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
