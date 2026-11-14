import type { Locale } from "@/lib/i18n/config";

/**
 * Panas: the bands and artists Dani has played with. One entry per pana.
 * Text in [brackets] is a placeholder: replace it with the real thing.
 *
 * media.type
 *   "tutorial" — Dani shows how he plays a song with them
 *   "live"     — a video of them playing together live (e.g. only worked live)
 *   "studio"   — a clip from a session
 * video.provider
 *   "youtube" (id = the part after v=), "vimeo" (id = the number), or "file"
 *   (src = /assets/... mp4). Leave video null until there is one.
 */

type T = Record<Locale, string>;

export type PanaVideo =
  | { provider: "youtube" | "vimeo"; id: string; poster?: string }
  | { provider: "file"; src: string; poster?: string };

export type Pana = {
  slug: string;
  name: string;
  /** what Dani did with them */
  role: T;
  years: string;
  photos: { src: string; width: number; height: number; alt: T }[];
  /** in Dani's words, first person; one string per paragraph */
  story: Record<Locale, string[]>;
  media: { type: "tutorial" | "live" | "studio"; title: T; video: PanaVideo | null } | null;
};

export const panas: Pana[] = [
  {
    slug: "dstance",
    name: "Dstance",
    role: { en: "live guitar", es: "guitarra en vivo" },
    years: "[year]",
    photos: [
      // [placeholder photos: swap for shots from the Dstance shows]
      {
        src: "/assets/lolla-stage.jpg",
        width: 527,
        height: 526,
        alt: { en: "[Dstance live: photo description]", es: "[Dstance en vivo: descripción de la foto]" },
      },
      {
        src: "/assets/bw-live.jpg",
        width: 527,
        height: 593,
        alt: { en: "[Dstance live: photo description]", es: "[Dstance en vivo: descripción de la foto]" },
      },
    ],
    story: {
      en: ["[How Dani and Dstance met, what the shows were like, a moment from the road. In Dani’s words.]"],
      es: ["[Cómo se conocieron Dani y Dstance, cómo eran los shows, un momento de gira. En palabras de Dani.]"],
    },
    media: {
      type: "live",
      title: { en: "Live with Dstance [venue, year]", es: "En vivo con Dstance [lugar, año]" },
      video: null,
    },
  },
  {
    slug: "pana-2",
    name: "[Artist]",
    role: { en: "[guitar, production]", es: "[guitarra, producción]" },
    years: "[year]",
    photos: [
      {
        src: "/assets/hands-acoustic.jpg",
        width: 528,
        height: 378,
        alt: { en: "[photo description]", es: "[descripción de la foto]" },
      },
    ],
    story: {
      en: ["[The story with this artist, in Dani’s words.]"],
      es: ["[La historia con este artista, en palabras de Dani.]"],
    },
    media: {
      type: "tutorial",
      title: { en: "Tutorial: [song]", es: "Tutorial: [canción]" },
      video: null,
    },
  },
  {
    slug: "pana-3",
    name: "[Band]",
    role: { en: "[bass, keys]", es: "[bajo, teclas]" },
    years: "[year]",
    photos: [
      {
        src: "/assets/big-room.jpg",
        width: 529,
        height: 654,
        alt: { en: "[photo description]", es: "[descripción de la foto]" },
      },
    ],
    story: {
      en: ["[The story with this band, in Dani’s words.]"],
      es: ["[La historia con esta banda, en palabras de Dani.]"],
    },
    media: {
      type: "studio",
      title: { en: "In the studio: [song]", es: "En el estudio: [canción]" },
      video: null,
    },
  },
  {
    slug: "pana-4",
    name: "[Artist]",
    role: { en: "[session guitar]", es: "[guitarra de sesión]" },
    years: "[year]",
    photos: [
      {
        src: "/assets/stage-strat.jpg",
        width: 527,
        height: 653,
        alt: { en: "[photo description]", es: "[descripción de la foto]" },
      },
    ],
    story: {
      en: ["[The story with this artist, in Dani’s words.]"],
      es: ["[La historia con este artista, en palabras de Dani.]"],
    },
    media: {
      type: "tutorial",
      title: { en: "Tutorial: [song]", es: "Tutorial: [canción]" },
      video: null,
    },
  },
];
