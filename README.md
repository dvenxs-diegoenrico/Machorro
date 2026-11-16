# chorro.com

Website for Daniel "Chorro" Machorro Delmar and his studio, Elvis Cave.
Next.js (App Router) + TypeScript, deployed on Vercel. Agency: Diego Enrico · Soluciones Creativas.

## Run

```
npm install
npm run dev        # http://localhost:3000 → redirects to /en
npm run build
npm run typecheck
```

## Where things live

- `styles/tokens.css` — every color, type and motif token (Sand and Night themes)
- `styles/motion.css` — the motion system: enter, loop and touch animations (used via `data-reveal`), the liquid blobs and the liquid-screen ripples
- `scripts/caustic.py` — generates the liquid-screen textures (inlined in `styles/motion.css`)
- `scripts/hero_edit.py` — the hero photo edit (haze, olive blacks)
- `content/credits.json` — the credits ledger, most played first (from Dani's Muso profile); `content/credits.more.ts` lists more artists
- `public/assets/live`, `public/assets/studio`, `public/assets/panas/<slug>` — photos (resized, metadata stripped)
- `content/panas.ts` — the panas: bands and artists, their photos, Dani's story and one video each
- `content/site.config.ts` — ticker, booking month, handles
- `content/dictionaries/` — English and Spanish copy
- `components/site/` — public site components
- `proxy.ts` — sends un-prefixed paths to `/en`

## Sessions (the private console)

Dani uploads, panas listen. Nobody downloads.

- `/[locale]/sessions`: panas sign in by email link and see what's shared with them
- `/[locale]/sessions/p/<id>`: the console (waveform, mix / stems / master, mixer, comments)
- `/[locale]/sessions/admin`: Dani's producer panel (projects, panas, uploads, access, invite links, listens)
- `/[locale]/sessions/demo`: the console with a generated session, no account needed

How audio is handled (`lib/audio/codec.ts`):
1. The WAV is decoded and compressed **in Dani's browser** to Opus 256 kbps (AAC where Opus isn't available). It never leaves his computer.
2. The compressed file is wrapped in our own container (`.chorro`) and encrypted with a fresh AES-256 key.
3. Only the ciphertext is uploaded, to a private bucket. The key goes to `track_keys`, which nobody can read directly.
4. A pana's console gets a 60-second signed URL and one key at a time through `get_track_key()`, which checks access, rate-limits and logs the listen.
5. Audio is decoded into memory and played through Web Audio. There is no `<audio>` element and no file to save.

Setup:
1. Create a Supabase project and apply `supabase/migrations/0001_sessions.sql`.
2. Add Dani's login email: `insert into public.admins (email) values ('...');`
3. In Supabase Auth → URL configuration, add `https://<site>/auth/callback` as a redirect URL.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel.

`npm test` runs the mixer logic tests.
