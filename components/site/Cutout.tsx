import Image from "next/image";
import { cutouts, type CutoutKey } from "@/content/cutouts";
import styles from "./Cutout.module.css";

/**
 * Chorro cut out of a photo, magazine style: a clean silhouette with a white
 * scissor-cut rim. Fills the width of its parent; height follows the figure.
 */
export function Cutout({
  name,
  alt,
  sizes = "(max-width: 900px) 40vw, 18vw",
  className = "",
}: {
  name: CutoutKey;
  alt: string;
  sizes?: string;
  className?: string;
}) {
  const { src, width, height } = cutouts[name];
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={`${styles.cutout} ${className}`}
    />
  );
}
