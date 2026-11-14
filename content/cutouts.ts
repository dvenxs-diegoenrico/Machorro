/**
 * Chorro, cut out of the live photos. The PNGs are made with scripts/cutout.py
 * (background removal + edge clean-up); components/site/Cutout.tsx adds the white
 * scissor-cut rim and paper shadow.
 */
export type CutoutKey = "lespaul" | "strat" | "lolla";

export const cutouts: Record<CutoutKey, { src: string; width: number; height: number }> = {
  lespaul: { src: "/assets/cut-lespaul.png", width: 638, height: 1180 },
  strat: { src: "/assets/cut-strat.png", width: 282, height: 992 },
  lolla: { src: "/assets/cut-lolla.png", width: 352, height: 592 },
};
