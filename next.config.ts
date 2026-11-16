import type { NextConfig } from "next";

const security = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

/** The private side: never cached, never framed, never indexed, no referrer leaks. */
const sessions = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const config: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/:path*", headers: security },
      { source: "/:locale(en|es)/sessions/:path*", headers: sessions },
      { source: "/:locale(en|es)/sessions", headers: sessions },
      { source: "/auth/:path*", headers: sessions },
    ];
  },
};

export default config;
