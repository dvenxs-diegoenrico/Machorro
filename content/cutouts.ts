import type { Point } from "@/lib/shapes/torn";

/**
 * Chorro, ripped out of the live photos. Each outline is a loose polygon drawn around him
 * in image pixels; components/site/Cutout.tsx tears the edge and adds the white paper rim.
 * To add one: open the photo, note ~15 points clockwise around the figure, add an entry.
 */
export type CutoutKey = "lespaul" | "strat" | "lolla" | "bw";

export const cutouts: Record<
  CutoutKey,
  { src: string; width: number; height: number; seed: number; outline: readonly Point[] }
> = {
  lespaul: {
    src: "/assets/lespaul-blur.jpg",
    width: 528,
    height: 653,
    seed: 7,
    outline: [
      [178, 52], [292, 48], [322, 112], [398, 88], [462, 92], [468, 152], [396, 205], [388, 262],
      [348, 332], [352, 653], [172, 653], [178, 424], [138, 392], [112, 300], [118, 208], [168, 150], [186, 100],
    ],
  },
  strat: {
    src: "/assets/stage-strat.jpg",
    width: 527,
    height: 653,
    seed: 19,
    outline: [
      [262, 140], [304, 140], [316, 196], [312, 228], [338, 282], [338, 342], [322, 412], [326, 653],
      [196, 653], [196, 422], [174, 372], [176, 298], [212, 266], [236, 218], [246, 186],
    ],
  },
  lolla: {
    src: "/assets/lolla-stage.jpg",
    width: 527,
    height: 526,
    seed: 31,
    outline: [
      [236, 222], [302, 222], [312, 278], [342, 312], [402, 296], [404, 336], [322, 372], [308, 402],
      [304, 526], [222, 526], [224, 382], [212, 332], [182, 316], [188, 284], [234, 262],
    ],
  },
  bw: {
    src: "/assets/bw-live.jpg",
    width: 527,
    height: 593,
    seed: 43,
    outline: [
      [188, 78], [300, 70], [318, 170], [380, 215], [452, 190], [452, 240], [392, 300], [388, 420],
      [330, 470], [340, 593], [140, 593], [150, 470], [118, 400], [120, 300], [160, 220], [196, 180],
    ],
  },
};
