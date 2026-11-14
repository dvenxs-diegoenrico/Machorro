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
- `content/credits.json` — rows for the credits ledger
- `content/panas.ts` — the panas: bands and artists, their photos, Dani's story and one video each
- `content/site.config.ts` — ticker, booking month, handles
- `content/dictionaries/` — English and Spanish copy
- `components/site/` — public site components
- `proxy.ts` — sends un-prefixed paths to `/en`
