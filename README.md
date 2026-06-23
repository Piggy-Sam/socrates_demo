# Socrates AI

> _Think out loud. Know thyself._

An instrument for the examined life: a voice that calls you each day, draws out
your half-formed thoughts, spars with your reasoning, and keeps the record of
your mind as it moves. Socrates is a **midwife of thought** — it helps you
deliver your ideas, it does not deliver its own.

See [`SPEC.md`](./SPEC.md) for the full product, architecture, and design brief.

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind v4** on Vercel
- **Supabase** (Postgres + pgvector + Auth) via Drizzle
- **OpenAI** (brain + embeddings) · **ElevenLabs** (voice) · **Twilio** (PSTN)

## Design system — "The Philosopher's Instrument"

The examined life (warm antique-gold) meets a precise instrument (cool
Aegean-night teal). Fraunces / Spectral / Geist / Geist Mono. The signature is
**the constellation of your mind** — your bank rendered as a personal night sky,
with Socrates' presence as a single warm-gold breathing star.

- Tokens & theming: `app/globals.css` (dark "Aegean Night" + light "Marble" + system)
- Signature primitives: `components/sky/constellation.tsx`, `components/sky/breathing-star.tsx`
- Live design lab + about: visit `/about`

## Develop

```bash
cp .env.local.txt .env.local   # already populated
npm install
npm run dev                     # http://localhost:3000
```

## The seams (shared contracts)

- **Brain** — `app/api/llm/chat/completions` speaks the OpenAI Chat Completions
  wire format; types in `lib/llm/types.ts`. One brain, two surfaces (voice + text).
- **Identity** — `lib/socrates/system-prompt.ts` (verbatim, never-yielding),
  injected server-side on every turn.
- **Data** — `lib/db/schema.ts` (Drizzle): the bank — entries, themes, summaries,
  patterns, sessions, messages, profiles.
