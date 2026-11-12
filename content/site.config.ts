import type { Locale } from "@/lib/i18n/config";

/**
 * Everything that changes month to month lives here.
 * [brackets] mark facts we don't have yet.
 */
export const siteConfig = {
  url: "https://chorro.com",
  nowSpinning: {
    artist: { en: "[artist]", es: "[artista]" } satisfies Record<Locale, string>,
    song: { en: "[song]", es: "[canción]" } satisfies Record<Locale, string>,
  },
  bookingMonth: { en: "[month]", es: "[mes]" } satisfies Record<Locale, string>,
  /** true → "elvis has not left the building"; false → "elvis has left the building" */
  bookingOpen: true,
  handles: [
    { handle: "@chorromx", href: "https://instagram.com/chorromx" },
    { handle: "@elviscave", href: "https://instagram.com/elviscave" },
  ],
};
