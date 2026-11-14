"use client";

import { useState } from "react";
import type { PanaVideo } from "@/content/panas";
import styles from "./VideoEmbed.module.css";

/**
 * A video that loads nothing until it's played: a poster and a play button first,
 * then the real player (YouTube via youtube-nocookie, Vimeo, or a file).
 * With no video yet, shows a placeholder frame with `emptyLabel`.
 */
export function VideoEmbed({
  video,
  title,
  playLabel,
  emptyLabel,
}: {
  video: PanaVideo | null;
  title: string;
  playLabel: string;
  emptyLabel: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (!video) {
    return (
      <div className={`${styles.frame} ${styles.empty}`}>
        <span className="caps">{emptyLabel}</span>
      </div>
    );
  }

  if (video.provider === "file") {
    return (
      <div className={styles.frame}>
        <video className={styles.player} src={video.src} poster={video.poster} controls playsInline preload="none" title={title} />
      </div>
    );
  }

  const poster =
    video.poster ?? (video.provider === "youtube" ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` : undefined);
  const src =
    video.provider === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`
      : `https://player.vimeo.com/video/${video.id}?autoplay=1&dnt=1`;

  return (
    <div className={styles.frame}>
      {playing ? (
        <iframe
          className={styles.player}
          src={src}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button type="button" className={styles.facade} onClick={() => setPlaying(true)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {poster && <img src={poster} alt="" loading="lazy" />}
          <span className={styles.play} aria-hidden="true" />
          <span className="sr-only">
            {playLabel}: {title}
          </span>
        </button>
      )}
    </div>
  );
}
