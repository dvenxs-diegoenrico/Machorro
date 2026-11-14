import { CAUSTIC_DARK, CAUSTIC_LIGHT, CAUSTIC_SIZE } from "./caustic";

/**
 * The liquid-screen textures as SVG patterns, defined once in the layout so any inline
 * SVG can fill a shape with them: fill="url(#caustic-light)". The stickers that use
 * them already spin, so the texture itself holds still.
 */
export function CausticDefs() {
  const s = CAUSTIC_SIZE;
  const layer = (id: string, href: string, offset: number) => (
    <pattern id={id} patternUnits="userSpaceOnUse" width={s} height={s} patternTransform={`translate(${offset} ${offset / 2})`}>
      <image href={href} width={s} height={s} />
    </pattern>
  );
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
      <defs>
        {layer("caustic-light", CAUSTIC_LIGHT, 0)}
        {layer("caustic-dark", CAUSTIC_DARK, 120)}
      </defs>
    </svg>
  );
}
