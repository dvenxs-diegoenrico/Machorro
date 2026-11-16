import type { Locale } from "@/lib/i18n/config";

/**
 * Panas: the bands and artists Dani has played with, most visible first.
 * Facts come from Dani's own files (dates, places, roles, songs). Add his stories in his words.
 *
 * media.type
 *   "tutorial" — Dani shows how he plays a song with them
 *   "live"     — a video of them playing together live
 *   "studio"   — a clip from a session
 *   "video"    — an official video he worked on
 * video.provider: "youtube" (id = the part after v=), "vimeo" (id) or "file" (src = /assets/... mp4).
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
  /** first person; one string per paragraph */
  story: Record<Locale, string[]>;
  /** a line from the press, with its source */
  press?: { quote: T; source: string; url: string };
  media: { type: "tutorial" | "live" | "studio" | "video"; title: T; video: PanaVideo | null } | null;
  /** more videos, as plain links */
  more?: string[];
};

export const panas: Pana[] = [
  {
    slug: "fifteen0eight",
    name: "Fifteen0Eight",
    role: { en: "live guitar", es: "guitarra en vivo" },
    years: "2024",
    photos: [
      { src: "/assets/panas/fifteen0eight/01.jpg", width: 800, height: 1200, alt: { en: "Chorro on the Lollapalooza stage with Fifteen0Eight, hands on his head, crowd behind", es: "Chorro en el escenario de Lollapalooza con Fifteen0Eight, manos en la cabeza, el público detrás" } },
      { src: "/assets/panas/fifteen0eight/02.jpg", width: 800, height: 1200, alt: { en: "Chorro digging into his Stratocaster at Lollapalooza", es: "Chorro clavado en su Stratocaster en Lollapalooza" } },
      { src: "/assets/panas/fifteen0eight/03.jpg", width: 1200, height: 800, alt: { en: "Fifteen0Eight live at Brighton Music Hall, in black and white", es: "Fifteen0Eight en vivo en Brighton Music Hall, en blanco y negro" } },
      { src: "/assets/panas/fifteen0eight/04.jpg", width: 995, height: 1200, alt: { en: "The Lollapalooza 2024 lineup poster with Fifteen0Eight on it", es: "El cartel de Lollapalooza 2024 con Fifteen0Eight" } },
    ],
    story: { en: ["Lollapalooza, Chicago, August 2024. We opened Day 2 on the BACARDI stage.", "We also played Brighton Music Hall in Boston."], es: ["Lollapalooza, Chicago, agosto de 2024. Abrimos el día 2 en el escenario BACARDI.", "También tocamos en Brighton Music Hall, en Boston."] },
    press: { quote: { en: "Commanded the stage like a pro.", es: "Dominaron el escenario como profesionales." }, source: "antiMusic, Lollapalooza 2024 Day Two report", url: "https://www.antimusic.com/reviews/24/lollapalooza-2024-day-two-report/" },
    media: null,
  },
  {
    slug: "dstance",
    name: "Dstance",
    role: { en: "live guitar", es: "guitarra en vivo" },
    years: "",
    photos: [
      { src: "/assets/panas/dstance/01.jpg", width: 800, height: 1200, alt: { en: "Chorro on a festival stage with Dstance, under the lighting rig", es: "Chorro en un escenario de festival con Dstance, bajo la estructura de luces" } },
      { src: "/assets/panas/dstance/02.jpg", width: 1200, height: 800, alt: { en: "Chorro on stage with the band during a Dstance show", es: "Chorro en el escenario con la banda en un show de Dstance" } },
      { src: "/assets/panas/dstance/03.jpg", width: 1200, height: 800, alt: { en: "Chorro and Dstance playing in Puebla", es: "Chorro y Dstance tocando en Puebla" } },
      { src: "/assets/panas/dstance/04.jpg", width: 1200, height: 800, alt: { en: "The full stage at a Dstance festival show", es: "El escenario completo en un show de festival de Dstance" } },
    ],
    story: { en: ["Live guitar for Dstance, from festival stages to a gig in Puebla."], es: ["Guitarra en vivo para Dstance, de escenarios de festival a un show en Puebla."] },
    media: { type: "live", title: { en: "Live with Dstance", es: "En vivo con Dstance" }, video: null },
  },
  {
    slug: "teo",
    name: "Teo",
    role: { en: "composer, producer, mixing, guitar", es: "compositor, productor, mezcla, guitarra" },
    years: "2026",
    photos: [
      { src: "/assets/panas/teo/01.jpg", width: 799, height: 1200, alt: { en: "Chorro playing on stage with Teo under blue lights", es: "Chorro tocando en el escenario con Teo bajo luces azules" } },
      { src: "/assets/panas/teo/02.jpg", width: 675, height: 1200, alt: { en: "Chorro mid-song with his Stratocaster at a Teo show", es: "Chorro en plena canción con su Stratocaster en un show de Teo" } },
      { src: "/assets/panas/teo/03.jpg", width: 900, height: 1200, alt: { en: "Chorro with a white bass on a TV set", es: "Chorro con un bajo blanco en un set de televisión" } },
      { src: "/assets/panas/teo/04.jpg", width: 675, height: 1200, alt: { en: "Chorro on stage facing a full theatre, seen from behind", es: "Chorro en el escenario frente a un teatro lleno, visto de espaldas" } },
      { src: "/assets/panas/teo/05.jpg", width: 799, height: 1200, alt: { en: "Chorro at the keys and laptop rig during a show", es: "Chorro en los teclados y la laptop durante un show" } },
      { src: "/assets/panas/teo/06.jpg", width: 1200, height: 799, alt: { en: "Teo’s band backstage", es: "La banda de Teo detrás del escenario" } },
      { src: "/assets/panas/teo/07.jpg", width: 1200, height: 799, alt: { en: "The band in silhouette against the stage lights", es: "La banda a contraluz frente a las luces del escenario" } },
    ],
    story: { en: ["Writing, producing, mixing and playing guitar with Teo: Falta Por Vivir, Pálpitos, Tal Vez, No Tiene Forma and more.", "On stage too: theatres, TV and a lot of soundchecks."], es: ["Componiendo, produciendo, mezclando y tocando guitarra con Teo: Falta Por Vivir, Pálpitos, Tal Vez, No Tiene Forma y más.", "También en el escenario: teatros, televisión y muchas pruebas de sonido."] },
    media: null,
  },
  {
    slug: "moncho-berry",
    name: "Moncho Berry",
    role: { en: "guest guitarist", es: "guitarrista invitado" },
    years: "2023 · 2025",
    photos: [
      { src: "/assets/panas/moncho-berry/01.jpg", width: 800, height: 1200, alt: { en: "Chorro playing under blue light at a Moncho Berry concert", es: "Chorro tocando bajo luz azul en un concierto de Moncho Berry" } },
      { src: "/assets/panas/moncho-berry/02.jpg", width: 1200, height: 800, alt: { en: "Chorro on stage at Moncho Berry’s album launch", es: "Chorro en el escenario en el lanzamiento del disco de Moncho Berry" } },
      { src: "/assets/panas/moncho-berry/03.jpg", width: 800, height: 1200, alt: { en: "Chorro bent over his guitar in a beam of light, in black and white", es: "Chorro inclinado sobre su guitarra bajo un haz de luz, en blanco y negro" } },
      { src: "/assets/panas/moncho-berry/04.jpg", width: 900, height: 1200, alt: { en: "Chorro and Moncho Berry sharing the stage under pink lights", es: "Chorro y Moncho Berry compartiendo escenario bajo luces rosas" } },
      { src: "/assets/panas/moncho-berry/05.jpg", width: 960, height: 1200, alt: { en: "Concert poster: Moncho Berry album launch, guest artist Chorro", es: "Cartel del concierto: lanzamiento del disco de Moncho Berry, artista invitado Chorro" } },
      { src: "/assets/panas/moncho-berry/06.jpg", width: 1200, height: 1199, alt: { en: "Concert poster: La noche de Barranco, guest musician Chorro", es: "Cartel del concierto: La noche de Barranco, músico invitado Chorro" } },
    ],
    story: { en: ["Guest guitarist with Moncho Berry in Lima, Peru: La noche de Barranco in 2023, and his album launch at Sala Osma, Barranco, in November 2025.", "On record: Solito, Por Las Tardes and Moon."], es: ["Guitarrista invitado de Moncho Berry en Lima, Perú: La noche de Barranco en 2023 y el lanzamiento de su disco en Sala Osma, Barranco, en noviembre de 2025.", "En disco: Solito, Por Las Tardes y Moon."] },
    media: null,
  },
  {
    slug: "mattias",
    name: "mattias",
    role: { en: "producer, composer", es: "productor, compositor" },
    years: "2023–2026",
    photos: [
      { src: "/assets/panas/mattias/01.jpg", width: 900, height: 1200, alt: { en: "Chorro and mattias playing live at Savage Labs under red light", es: "Chorro y mattias tocando en vivo en Savage Labs bajo luz roja" } },
      { src: "/assets/panas/mattias/02.jpg", width: 1200, height: 1060, alt: { en: "Video credits for What Makes a Man, produced with Chorro", es: "Créditos del video What Makes a Man, producido con Chorro" } },
      { src: "/assets/panas/mattias/03.jpg", width: 1196, height: 1200, alt: { en: "Video credits for Jealousy, produced with Chorro", es: "Créditos del video Jealousy, producido con Chorro" } },
      { src: "/assets/panas/mattias/04.jpg", width: 1126, height: 1200, alt: { en: "Video credits for Clutter, produced with Chorro", es: "Créditos del video Clutter, producido con Chorro" } },
      { src: "/assets/panas/mattias/05.jpg", width: 1130, height: 1200, alt: { en: "Video credits for Shotgun Wedding, produced with Chorro", es: "Créditos del video Shotgun Wedding, producido con Chorro" } },
    ],
    story: { en: ["Co-producing and writing with mattias: What Makes a Man, Clutter, Jealousy, Shotgun Wedding, Friendly Fire, Reason, Sweet Tooth and more.", "And playing them live, like this night at Savage Labs."], es: ["Coproduciendo y componiendo con mattias: What Makes a Man, Clutter, Jealousy, Shotgun Wedding, Friendly Fire, Reason, Sweet Tooth y más.", "Y tocándolas en vivo, como esta noche en Savage Labs."] },
    media: { type: "video", title: { en: "mattias, official video", es: "mattias, video oficial" }, video: { provider: "youtube", id: "yw0RYa4qIEg" } },
    more: ["https://www.youtube.com/watch?v=oePAaSXSDb8", "https://www.youtube.com/watch?v=ta6sN-4puRc", "https://www.youtube.com/shorts/mdyCKAoGE3s"],
  },
  {
    slug: "better-strangers",
    name: "Better Strangers",
    role: { en: "keys & synths", es: "teclados y sintetizadores" },
    years: "2025",
    photos: [
      { src: "/assets/panas/better-strangers/01.jpg", width: 1130, height: 1200, alt: { en: "Better Strangers and Chorro at Brain Damage Studios", es: "Better Strangers y Chorro en Brain Damage Studios" } },
      { src: "/assets/panas/better-strangers/02.jpg", width: 1161, height: 1200, alt: { en: "Keys and synths set up for the session", es: "Teclados y sintetizadores listos para la sesión" } },
      { src: "/assets/panas/better-strangers/03.jpg", width: 1056, height: 1200, alt: { en: "Still from Archons (Live at Brain Damage Studios)", es: "Fotograma de Archons (Live at Brain Damage Studios)" } },
      { src: "/assets/panas/better-strangers/04.jpg", width: 1191, height: 1200, alt: { en: "Still from Mardi Gras (Live at Brain Damage Studios)", es: "Fotograma de Mardi Gras (Live at Brain Damage Studios)" } },
    ],
    story: { en: ["Keys and synths on Better Strangers’ live session at Brain Damage Studios in Dania Beach, Florida: Archons and Mardi Gras, recorded in October 2025."], es: ["Teclados y sintetizadores en la sesión en vivo de Better Strangers en Brain Damage Studios, Dania Beach, Florida: Archons y Mardi Gras, grabadas en octubre de 2025."] },
    media: { type: "live", title: { en: "Live at Brain Damage Studios", es: "En vivo en Brain Damage Studios" }, video: { provider: "youtube", id: "2oaZfMjKGjQ" } },
    more: ["https://www.youtube.com/watch?v=yuwn7OvYTK8"],
  },
  {
    slug: "anna-sofia",
    name: "Anna Sofia",
    role: { en: "live guitar", es: "guitarra en vivo" },
    years: "2025",
    photos: [
      { src: "/assets/panas/anna-sofia/01.jpg", width: 698, height: 1200, alt: { en: "Anna Sofia’s name on the big screen at Kaseya Center, the band below", es: "El nombre de Anna Sofia en la pantalla del Kaseya Center, la banda abajo" } },
    ],
    story: { en: ["Kaseya Center, Miami, September 2025."], es: ["Kaseya Center, Miami, septiembre de 2025."] },
    media: null,
  },
  {
    slug: "fabian",
    name: "Fabian",
    role: { en: "live guitar", es: "guitarra en vivo" },
    years: "2024 · 2025",
    photos: [
      { src: "/assets/panas/fabian/01.jpg", width: 675, height: 1200, alt: { en: "Chorro playing at Carnival on the Mile with Fabian", es: "Chorro tocando en Carnival on the Mile con Fabian" } },
      { src: "/assets/panas/fabian/02.jpg", width: 800, height: 1200, alt: { en: "Chorro playing under blue light at Fabian’s showcase in Lima", es: "Chorro tocando bajo luz azul en el showcase de Fabian en Lima" } },
      { src: "/assets/panas/fabian/03.jpg", width: 975, height: 1200, alt: { en: "Poster for Fabian’s showcase", es: "Cartel del showcase de Fabian" } },
    ],
    story: { en: ["Fabian’s showcase in Lima, Peru, in November 2024, and Carnival on the Mile in Miami in March 2025."], es: ["El showcase de Fabian en Lima, Perú, en noviembre de 2024, y Carnival on the Mile en Miami en marzo de 2025."] },
    media: null,
  },
  {
    slug: "julien-raffaelli",
    name: "Julien Raffaelli",
    role: { en: "production", es: "producción" },
    years: "2025",
    photos: [
      { src: "/assets/panas/julien-raffaelli/01.jpg", width: 1200, height: 856, alt: { en: "Tracking an acoustic guitar for Julien Raffaelli in a wood-panelled room", es: "Grabando guitarra acústica para Julien Raffaelli en un cuarto de madera" } },
      { src: "/assets/panas/julien-raffaelli/02.jpg", width: 695, height: 1200, alt: { en: "Producing at the console for Julien Raffaelli", es: "Produciendo en la consola para Julien Raffaelli" } },
    ],
    story: { en: ["Producing for Julien Raffaelli, April 2025."], es: ["Produciendo para Julien Raffaelli, abril de 2025."] },
    media: null,
  },
  {
    slug: "street-racer",
    name: "Street Racer",
    role: { en: "live guitar", es: "guitarra en vivo" },
    years: "",
    photos: [
      { src: "/assets/panas/street-racer/01.jpg", width: 900, height: 1200, alt: { en: "Chorro playing on an outdoor stage with Street Racer", es: "Chorro tocando en un escenario al aire libre con Street Racer" } },
      { src: "/assets/panas/street-racer/02.jpg", width: 900, height: 1200, alt: { en: "Chorro at soundcheck, selfie from the stage", es: "Chorro en la prueba de sonido, selfie desde el escenario" } },
    ],
    story: { en: ["Live guitar with Street Racer."], es: ["Guitarra en vivo con Street Racer."] },
    media: null,
  },
  {
    slug: "tiare",
    name: "Tiare",
    role: { en: "live guitar", es: "guitarra en vivo" },
    years: "",
    photos: [
      { src: "/assets/panas/tiare/01.jpg", width: 800, height: 1200, alt: { en: "Chorro on guitar behind Tiare at Savage Labs", es: "Chorro en la guitarra detrás de Tiare en Savage Labs" } },
    ],
    story: { en: ["Live guitar with Tiare at Savage Labs."], es: ["Guitarra en vivo con Tiare en Savage Labs."] },
    media: null,
  },
];
