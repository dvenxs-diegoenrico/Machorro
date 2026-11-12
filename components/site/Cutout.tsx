import Image from "next/image";
import { cutouts, type CutoutKey } from "@/content/cutouts";
import { ripOutline } from "@/lib/shapes/torn";
import styles from "./Cutout.module.css";

/**
 * Chorro ripped out of a photo, magazine style: rough torn outline, white paper rim.
 * Fills the width of its parent; height follows the figure.
 */
export function Cutout({
  name,
  alt,
  sizes = "(max-width: 900px) 45vw, 22vw",
  className = "",
}: {
  name: CutoutKey;
  alt: string;
  sizes?: string;
  className?: string;
}) {
  const { src, width, height, seed, outline } = cutouts[name];
  const { torn, box } = ripOutline(outline, seed);
  const clip = torn
    .map(([x, y]) => `${((x / width) * 100).toFixed(2)}% ${((y / height) * 100).toFixed(2)}%`)
    .join(", ");

  return (
    <span className={`${styles.cutout} ${className}`} style={{ aspectRatio: `${box.w} / ${box.h}` }}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        style={{
          width: `${(width / box.w) * 100}%`,
          left: `${(-box.x / box.w) * 100}%`,
          top: `${(-box.y / box.h) * 100}%`,
          clipPath: `polygon(${clip})`,
        }}
      />
    </span>
  );
}
