import { NextResponse } from "next/server";

/**
 * Booking form → email to Chorro, sent with Resend's HTTP API.
 *
 * Env (see .env.example):
 *   RESEND_API_KEY  required to send
 *   BOOKING_TO      where bookings go (Chorro's inbox)
 *   BOOKING_FROM    a sender on a domain verified in Resend
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // honeypot: bots fill it, people can't see it. Pretend it worked.
  if (clean(body.company, 200)) return NextResponse.json({ ok: true });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const link = clean(body.link, 500);
  const need = clean(body.need, 120);
  const budget = clean(body.budget, 80);
  const message = clean(body.message, 4000);
  const locale = clean(body.locale, 5);

  if (!name || !EMAIL.test(email)) {
    return NextResponse.json({ error: "invalid" }, { status: 422 });
  }
  if (link && !/^https?:\/\//i.test(link)) {
    return NextResponse.json({ error: "invalid" }, { status: 422 });
  }

  const text = [
    `name:    ${name}`,
    `email:   ${email}`,
    `demo:    ${link || "—"}`,
    `need:    ${need || "—"}`,
    `budget:  ${budget || "—"}`,
    `site:    /${locale || "en"}`,
    "",
    message || "(no message)",
  ].join("\n");

  const { RESEND_API_KEY, BOOKING_TO, BOOKING_FROM } = process.env;
  if (!RESEND_API_KEY || !BOOKING_TO) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[booking] not configured, would have sent:\n" + text);
    }
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: BOOKING_FROM || "chorro.com <onboarding@resend.dev>",
      to: [BOOKING_TO],
      reply_to: email,
      subject: `booking — ${name} · ${need || "song"}`,
      text,
    }),
  });

  if (!res.ok) {
    console.error("[booking] resend failed", res.status, await res.text());
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
