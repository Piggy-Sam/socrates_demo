export const meta = {
  name: 'socrates-tracks',
  description: 'Build the five Socrates AI feature tracks in parallel against the shared contracts',
  phases: [
    { title: 'A · Auth & onboarding' },
    { title: 'B · Brain & chat' },
    { title: 'C · On-demand voice' },
    { title: 'D · Pipeline & bank' },
    { title: 'E · Outbound, cron & recap' },
  ],
}

const TRACK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['track', 'filesCreated', 'summary', 'integrationNotes', 'blockers'],
  properties: {
    track: { type: 'string' },
    filesCreated: { type: 'array', items: { type: 'string' } },
    filesModified: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string', description: 'What you built, in 3-6 sentences' },
    integrationNotes: { type: 'string', description: 'Exactly what the main thread must wire up (nav links, seams, env to verify)' },
    blockers: { type: 'string', description: 'Anything blocked, uncertain, or needing follow-up; empty string if none' },
  },
}

const SHARED = `
PROJECT: Socrates AI — a voice that calls you each day and helps you reach your OWN clarity (a maieutic "midwife of thought", never a generic assistant). Next.js 16 (App Router, TS) + Tailwind v4 + Supabase + OpenAI + ElevenLabs. Repo root: /Users/yancun/Documents/Projects/socrates_demo (branch build/socrates-ai). The full source of truth is SPEC.md — READ the sections named in your task before writing.

FIRST, READ THESE EXISTING FILES (do not re-implement them — import and reuse):
- Design tokens & utilities: app/globals.css  (Tailwind v4 @theme). Color utilities: bg-ink, bg-raised, bg-raised-2, border-hairline, border-hairline-strong, text-marble, text-marble-dim, text-gold, text-gold-lit, text-cyan (and bg-gold etc). Fonts: font-display (Fraunces), font-serif (Spectral), font-sans (Geist), font-mono (Geist Mono). Utilities: .label-mono (uppercase tracked cyan mono label), .glow-gold, .grain, .text-balance, .text-pretty, .hairline-x. Keyframes: breathe, ignite, fade-rise, twinkle; easing var --ease-instrument. Radii rounded-sm/md/lg. DO NOT EDIT globals.css.
- Reusable components: components/ui/button.tsx (Button, LinkButton — variant: 'gold'|'outline'|'ghost', size: 'sm'|'md'|'lg'); components/brand/wordmark.tsx (Wordmark, StarMark); components/theme/theme-toggle.tsx; components/sky/breathing-star.tsx (BreathingStar — props: state 'idle'|'listening'|'speaking'|'thinking'|'ended', level number 0..1, size px); components/sky/constellation.tsx (Constellation — props: stars: SkyStar[], onSelect?, selectedId?, interactive?, framed?); lib/constellation.ts (SkyStar {id,type,content,themes?,brightness?,createdAt?}, EntryType, layoutStars, themeLinks, TYPE_GLYPH).
- Contracts: lib/socrates/system-prompt.ts (SOCRATES_SYSTEM_PROMPT, buildSystemPrompt(modality:'voice'|'text', ragContext?), VOICE_DELTA, TEXT_DELTA — VERBATIM, never alter the prompt); lib/llm/types.ts (ChatCompletionRequest, ChatMessage, ChatCompletionChunk, ChatCompletion); lib/db/schema.ts (Drizzle tables: profiles, sessions, messages, entries, themes, summaries, patterns + enums sessionType/messageRole/entryType/summaryKind/patternKind + inferred types Profile/Session/Entry/...).
- Infra (import, already built & migrated to the live DB): lib/db/client.ts (export db, schema — Drizzle over the pooler, RLS-bypassing trusted server path; scope queries by userId in code); lib/openai.ts (openai(), embed(text)->number[], embedMany(strings)); lib/rag.ts (getRagContext(userId, queryText, k?)->string, searchEntries(...)); lib/env.ts (env.* getters: env.openaiModel(), env.elevenLabsKey(), env.elevenLabsAgentId(), env.elevenLabsLlmSecret(), env.elevenLabsWebhookSecret(), env.elevenLabsPhoneNumberId(), env.cronSecret(), env.appUrl(), etc.; publicEnv.agentId/supabaseUrl/...); lib/supabase/server.ts (createClient — cookie session), lib/supabase/client.ts (createClient — browser), lib/supabase/admin.ts (createAdminClient — SECRET key, bypasses RLS); lib/auth.ts (getCurrentUser, requireUser, getProfile(userId), requireProfile()->{userId,profile}).

ROUTE STRUCTURE: protected app pages live under app/(app)/<name>/page.tsx — they inherit the authenticated shell (nav + profile guard) from app/(app)/layout.tsx. Public routes: app/page.tsx (landing), app/design, app/login, app/auth/*, app/onboarding. API routes under app/api/*. NEXT 16 NOTE: route handler params are async — type as { params: Promise<{...}> } and await them; cookies()/headers() are async (await them).

DESIGN LAW (this is the #1 priority of the project — make every surface unmistakably "Socrates AI", techy + academic, "the philosopher's instrument"):
- Aegean-night teal ground + antique-gold glow. GOLD IS RATIONED — at most one focal gold element per view (the primary action, or Socrates' star). Everything else quiet and disciplined.
- Mono (font-mono / .label-mono, cyan) carries technical readouts: timestamps, entry types, labels, metadata — sentence/UPPERCASE tracked. Serif (font-serif) carries the user's own words and Socrates' reflections — the bank reads like a commonplace book, not a feed. Sans (font-sans) for chrome/buttons/forms.
- ANTI-METRIC ETHOS AS LAW: NO streaks, badges, counts-as-pressure, gamification, "active now", or engagement bait — ever. Calm, spacious, generous whitespace, reverent toward the user's words. Empty states are invitations in Socrates' voice ("Nothing here yet. What's on your mind?"), sentence-case, warm, from the user's side ("your thoughts", not "entries DB").
- Accessibility: visible keyboard focus (already global via :focus-visible), respect prefers-reduced-motion (use useReducedMotion from 'motion/react' for any animation). Desktop-first, downscale cleanly to mobile (nothing broken/cramped). THE ONE EXCEPTION: any calling/voice surface is MOBILE-FIRST — large thumb-reachable targets, full-bleed presence, one-handed, then scale up.
- Use 'motion/react' (the Motion library, installed) for animation. Use lucide-react for icons (thin strokeWidth ~1.6).

SOCRATIC IDENTITY (never violate in any copy or behavior): Socrates ASKS, MIRRORS, stays QUIET; never flatters ("great idea!" is BANNED), never volunteers verdicts, is almost always shorter than the person. In UI copy, never gamify, never praise, never pressure. Keep it warm, dry, spare.

HARD RULES FOR YOU:
- ONLY create/edit files inside YOUR OWNERSHIP LIST below. Do NOT touch other tracks' files, app/globals.css, app/layout.tsx, app/(app)/layout.tsx, middleware.ts, components/app/app-nav.tsx, or any lib/* contract/infra file (you may IMPORT them).
- Do NOT modify package.json and do NOT run: npm install, npm run build, npm run dev, next build, or git. Do NOT run a project-wide tsc (other tracks are writing concurrently; you'd see unrelated errors). All needed deps are installed: @elevenlabs/react, @elevenlabs/client, openai, drizzle-orm, postgres, @supabase/ssr, @supabase/supabase-js, motion, zod, lucide-react, geist. If you believe a dep is missing, STOP and put it in blockers — do not install.
- You MAY read node_modules type definitions and use WebFetch/WebSearch to confirm third-party API shapes (ElevenLabs REST, @elevenlabs/react) before coding.
- Write production-grade, correct, fully-typed code. Match the existing code's style. Real implementations, not stubs.
- When done, return the structured summary (filesCreated, integrationNotes = exactly what the main thread must wire, blockers).
`

phase('Build tracks')

const TRACKS = [
  {
    key: 'A · Auth & onboarding',
    label: 'track-a-auth',
    prompt: `${SHARED}

YOU ARE TRACK A — AUTH & ONBOARDING. Read SPEC.md §4, §5 (profiles), §8 (auth+onboarding). Implement Supabase email magic-link auth and onboarding.

OWNERSHIP (create only these):
- app/login/page.tsx — magic-link request screen. Beautiful, on-brand (philosopher's instrument): centered, Wordmark, a serif invitation line in Socrates' voice, an email field (font-sans), a gold "Send me a link" Button. Use the browser Supabase client (lib/supabase/client.ts createClient()) .auth.signInWithOtp({ email, options: { emailRedirectTo: \`\${location.origin}/auth/callback?next=/today\` } }). Show a calm confirmation state ("Check your email — a link is on its way."). Client component. Honor a ?next= query param. Include a subtle link back to the landing. Keep a faint ambient star backdrop if tasteful (you may import Constellation with interactive={false} framed={false} + SAMPLE_SKY from lib/sample-sky.ts, dimmed) — optional.
- app/auth/callback/route.ts — GET handler: exchange the magic-link code for a session. Supabase magic links may arrive as ?code= (PKCE) — use a server supabase client (lib/supabase/server.ts) and supabase.auth.exchangeCodeForSession(code); then redirect to ?next (default /today). Also handle the token_hash/type flow (verifyOtp) as a fallback. On error redirect to /login?error=auth.
- app/onboarding/page.tsx + app/onboarding/onboarding-form.tsx (client) — collects display_name, timezone (default to Intl.DateTimeFormat().resolvedOptions().timeZone, offer a sensible select or text), daily_call_time (HH:MM, local), phone_e164 (with a note that the demo calls a Twilio-verified number). Warm, spare, serif-led copy in Socrates' voice (e.g. "Before we begin — what should I call you?"). The page is a server component that requireUser() (must be signed in) and pre-fills from any existing profile via getProfile.
- app/onboarding/actions.ts — 'use server' action upsertProfile(formData) that writes/updates the profiles row (db.insert(profiles)...onConflictDoUpdate, id = the authed user id from getCurrentUser()) and then redirect('/today'). Validate with zod. phone normalized to E.164 (basic).

NOTES:
- The (app) shell already redirects: no session -> /login, no profile.displayName -> /onboarding. So after onboarding completes, /today loads. middleware.ts treats /login and /auth as public; /onboarding requires a session (handled by requireUser in the page).
- Do NOT create app/today — that's Track D. Do NOT edit middleware or the (app) layout.
- integrationNotes: list nothing to wire unless you diverged.`,
  },
  {
    key: 'B · Brain & chat',
    label: 'track-b-brain',
    prompt: `${SHARED}

YOU ARE TRACK B — THE BRAIN & TEXT CHAT. Read SPEC.md §2 (identity), §6 (routes), §7 (custom-LLM notes), §11 (custom-LLM contract). This is the chokepoint that enforces the never-yielding identity.

OWNERSHIP (create only these):
- app/api/llm/chat/completions/route.ts — THE BRAIN. An OpenAI-compatible shim. Requirements (get these EXACTLY right):
  * export const runtime = 'nodejs'; export const maxDuration = 60 (streaming).
  * DUAL AUTH (one brain, two surfaces): (a) if header Authorization === \`Bearer \${env.elevenLabsLlmSecret()}\` -> trusted external caller (ElevenLabs); extract user_id from the request body's dynamic variables (check body.user_id, body.user, and ElevenLabs nesting like body.elevenlabs_extra_body?.user_id / conversation_initiation_client_data — be liberal). (b) ELSE try the in-app cookie session via lib/supabase/server.ts createClient().auth.getUser(); if a user, user_id = user.id. (c) else 401. Verify the bearer with a constant-time-ish compare.
  * Parse the body as ChatCompletionRequest (lib/llm/types.ts). Take the incoming messages but DROP any system messages from history (the identity cannot be overridden).
  * Build RAG: derive a query from the last 1-3 user messages, call getRagContext(user_id, query). Prepend the system message via buildSystemPrompt('voice'|'text', ragContext). Decide modality: 'voice' if the caller is the bearer/ElevenLabs, else 'text'.
  * Call OpenAI chat.completions with model = env.openaiModel() (NEVER forward an empty/incoming model id), temperature 0.8, stream: true. Relay the OpenAI SSE stream straight back to the client in the OpenAI chat.completion.chunk wire format (Content-Type text/event-stream, lines 'data: {json}\\n\\n', end with 'data: [DONE]\\n\\n'). Get the first token out fast (no buffering). Use the openai() client's streaming; you can iterate the stream and re-emit each chunk. If the incoming request has stream:false, return a single non-streaming chat.completion JSON instead.
  * Be robust: on OpenAI error return a 500 with an OpenAI-style error body. Never let RAG failure block the turn (getRagContext already returns '' on failure).
- lib/llm/brain.ts (optional helper) — pure helpers used by the route (e.g. extracting user_id, building the OpenAI params, sanitizing messages). Keep the route lean.
- app/(app)/chat/page.tsx — server component shell for the text chat (title in font-display, a short serif framing line; renders the client chat).
- app/(app)/chat/chat-client.tsx — 'use client' chat UI. The SAME mind as voice, in text. Design: a calm, reverent transcript — the user's words in font-serif, Socrates' replies in font-serif (a touch dimmer or marked with a small gold StarMark). NO assistant-y chrome, NO "AI is typing 3 dots" gimmick (a quiet breathing dot is fine). Input is a textarea (font-sans) with a gold send Button; Enter to send, Shift+Enter newline. Streaming: POST same-origin to /api/llm/chat/completions with { messages, stream:true } (cookie auth), read the ReadableStream, parse SSE 'data:' lines, append delta.content tokens live. Keep messages in state. Mobile: usable, not cramped.
- app/(app)/chat/actions.ts — 'use server'. ensureChatSession()->sessionId (create a sessions row type 'chat' for the user if none active, return id) and persistTurn(sessionId, userText, socratesText) (insert two messages rows: role 'user' and role 'socrates'). The client calls ensureChatSession on mount/first send and persistTurn after each completed assistant message. Scope everything to the authed user (getCurrentUser()).

CRITICAL: the system prompt is ALWAYS prepended server-side and cannot be overridden by message history. Temperature & model chosen in code. Never forward an empty model string.

integrationNotes: confirm the chat route path and that the bearer + cookie dual-auth works; note anything the voice/outbound tracks must know (they rely on this route being the agent's Custom LLM).`,
  },
  {
    key: 'C · On-demand voice',
    label: 'track-c-voice',
    prompt: `${SHARED}

YOU ARE TRACK C — ON-DEMAND IN-BROWSER VOICE (WebRTC). Read SPEC.md §1 (Talk anytime), §6 (/api/voice/token), §9 (Responsive: the call surface is MOBILE-FIRST), §3 (architecture). This is the breathing-star call screen — the most tactile, full-presence surface. Build it MOBILE-FIRST (big thumb targets, full-bleed, one-handed), then scale up to desktop.

VERIFY THE API FIRST: read node_modules/@elevenlabs/react types and, if needed, WebFetch the ElevenLabs docs to confirm the current useConversation API and the conversation-token endpoint. Known shape: GET https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=<id> with header 'xi-api-key' returns { token }. @elevenlabs/react exposes useConversation({ onConnect, onDisconnect, onMessage, onError, onModeChange/onStatusChange }) with conversation.startSession({ conversationToken | agentId, connectionType: 'webrtc', dynamicVariables }) and .endSession(); it exposes status and an isSpeaking/mode signal. Map agent speaking -> BreathingStar state 'speaking', listening (user turn) -> 'listening', connecting/thinking -> 'thinking', idle -> 'idle'.

OWNERSHIP (create only these):
- app/api/voice/token/route.ts — POST (or GET) handler, runtime 'nodejs'. requireUser() (cookie). Fetch a conversation token from ElevenLabs using env.elevenLabsKey() and env.elevenLabsAgentId(). Return { token, agentId, dynamicVariables } where dynamicVariables = { user_id: <authed user id>, display_name: <profile.displayName> , and (optional) recent_thread: a 1-line continuity hook from the user's most recent entry via searchEntries/db }. (The client passes these dynamicVariables into startSession so the brain receives user_id.) Never expose ELEVENLABS_API_KEY to the client.
- app/(app)/talk/page.tsx — server component: requireProfile(), render the client call screen, pass displayName.
- components/call/call-screen.tsx — 'use client'. THE on-demand call surface, mobile-first and gorgeous: a full-bleed Aegean-night field, the BreathingStar centered and LARGE as Socrates' presence, its state driven live by the conversation. A single big primary control: "Talk to Socrates" (gold) to start; while live, large round Mute and End controls (thumb-reachable, min 56px). A calm status line in .label-mono ("listening" / "Socrates is speaking" / "connecting"). Optional: live captions of the latest turn in font-serif (from onMessage), kept minimal. Requests mic permission via startSession. On start: POST /api/voice/token, then conversation.startSession({ conversationToken: token, connectionType: 'webrtc', dynamicVariables }). Handle errors (mic denied, token fail) with warm copy. Respect prefers-reduced-motion (BreathingStar already does). Clean teardown on unmount/end.
- components/call/use-socrates-call.ts (optional) — a hook wrapping useConversation to expose { start, end, mute, status, starState, lastMessage }.

NOTE: the hosted ElevenLabs agent calls our brain (Track B's /api/llm/chat/completions) as its Custom LLM over the PUBLIC deployment URL — so live audio fully works only on the deployed site, not localhost. Build it correctly regardless; note this in integrationNotes. Do NOT build the outbound "Call me now" phone flow (that's Track E).

integrationNotes: confirm the token route contract and dynamicVariables passed; note the localhost limitation and any agent-dashboard config the user must verify.`,
  },
  {
    key: 'D · Pipeline & bank',
    label: 'track-d-pipeline',
    prompt: `${SHARED}

YOU ARE TRACK D — POST-CALL PIPELINE + THE BANK + DAILY SUMMARY. Read SPEC.md §5 (data model), §6 (/api/webhooks/elevenlabs), §9 (the constellation signature), §11 (webhook security + 30s limit). This fills the bank and renders it as the signature night sky.

OWNERSHIP (create only these):
- app/api/webhooks/elevenlabs/route.ts — POST, runtime 'nodejs', maxDuration 60. Steps: (1) read the RAW body text; verify the HMAC 'ElevenLabs-Signature' header against env.elevenLabsWebhookSecret() (ElevenLabs format: header is 't=<ts>,v0=<hmac_hex>'; compute HMAC-SHA256 over \`\${t}.\${rawBody}\` with the secret; constant-time compare; also tolerate a plain hex form). On failure 401. (2) Parse the event; only handle post_call_transcription / transcript events. (3) DEDUPE on conversation_id: look up sessions by elevenlabs_conversation_id; if exists, return 200 already-processed. (4) ACK FAST is preferred but Hobby has no background queue — so keep the pipeline LEAN and under 30s: do it inline but in as FEW OpenAI calls as possible (ONE structured extraction call that returns BOTH the entries AND the daily summary). (5) Resolve the user_id (from the event's conversation_initiation_client_data.dynamic_variables.user_id, or metadata). (6) Insert a sessions row (type from metadata: scheduled_call|on_demand_voice; transcript jsonb; elevenlabs_conversation_id; started/ended), insert messages rows from the transcript turns. (7) ONE OpenAI call (JSON mode / response_format json_schema) to extract atomic entries [{type one of idea|opinion|feeling|observation|question|decision, content, themes: string[]}] AND a short markdown daily summary in Socrates' restrained voice (NO praise, NO metrics). (8) embedMany the entry contents, insert entries rows (with embedding + themes). (9) upsert themes (label-keyed per user; bump entry_count, last_seen). (10) insert a summaries row kind 'daily' for today. Return 200 quickly. Idempotent + resilient (wrap stages so a late failure still returns 200 if the session was stored; log errors).
- lib/pipeline/extraction.ts — the extraction logic: extractAndStore(params) used by the webhook, plus a reusable export async function distillTranscript(userId, sessionId, transcriptText) returning the extracted entries+summary objects (so chat/other surfaces can reuse it). Keep all OpenAI prompts in Socrates' values (surface, never interpret; no flattery). Export clean typed functions.
- lib/pipeline/types.ts — shared types for extraction (ExtractedEntry, Distillation, etc.).
- app/(app)/today/page.tsx — the daily landing/dashboard (server component, requireProfile). Shows: a warm serif greeting in Socrates' voice using the time of day + display name (NO streaks/metrics); today's daily summary if present (rendered markdown, font-serif, like a commonplace entry); a few of the most recent entries (serif, with .label-mono type+time); and a prominent primary action area with two CTAs — a gold "Call me now" button (a small 'use client' component components/today/call-me-now.tsx that POSTs to /api/calls/trigger [Track E owns that route; if it 404s, fail gracefully with a calm message] and shows a calling state) and a LinkButton to /talk ("Talk now"). Empty state when no summary/entries: an invitation in Socrates' voice.
- components/today/call-me-now.tsx — 'use client' button described above.
- app/(app)/bank/page.tsx — THE BANK (server component, requireProfile). Loads the user's entries (db, scoped by userId, newest first, reasonable limit) and themes. Renders a header (font-display) + a view toggle between SKY and LIST (use a small client component components/bank/bank-view.tsx that receives the entries as props and toggles).
- components/bank/bank-view.tsx — 'use client'. SKY view: map entries -> SkyStar[] (id, type, content, themes, brightness from recency/recurrence) and render <Constellation stars=... onSelect=... selectedId=...>; selecting a star opens a detail panel (serif content, .label-mono metadata). LIST view: the bank as a commonplace book — entries grouped by day, each with .label-mono type+timestamp and font-serif content; a simple client-side search box (font-sans) filtering by text/theme. Include a tasteful toggle (sky / list) with .label-mono labels. Anti-metric: show no counts-as-pressure; "12 thoughts" as a quiet readout is fine, a streak is not.
- components/summary/markdown.tsx (optional) — a tiny, safe markdown renderer for summaries (or use a minimal approach). Keep it dependency-free (no new deps) — render basic markdown (headings, lists, bold, paragraphs) with the serif type, OR just render the text in serif with paragraph splitting if markdown rendering is risky.

NOTES: scope EVERY db read/write by the authenticated user's id. The webhook authenticates via HMAC (not cookies) and writes via the trusted db client. Do NOT create /api/calls/trigger (Track E).
integrationNotes: list (a) that the webhook is at /api/webhooks/elevenlabs (already excluded from middleware), (b) the /api/calls/trigger contract your call-me-now button expects (method, body), (c) whether you want chat (Track B) wired to distillTranscript for entries, (d) any seed-data suggestion to make the bank look populated in the demo.`,
  },
  {
    key: 'E · Outbound, cron & recap',
    label: 'track-e-outbound',
    prompt: `${SHARED}

YOU ARE TRACK E — OUTBOUND CALLS ("Call me now" + daily cron) + WEEKLY RECAP. Read SPEC.md §6 (/api/calls/trigger, /api/cron/daily), §8 (P1), §11 (cron daily-only/UTC; Twilio trial; "Call me now" is the primary demo path).

VERIFY THE API FIRST: read ElevenLabs docs (WebFetch) to confirm the current outbound-call endpoint. Known shape: POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call with header 'xi-api-key' and JSON { agent_id, agent_phone_number_id, to_number, conversation_initiation_client_data: { dynamic_variables: { user_id, display_name, recent_thread } } }.

OWNERSHIP (create only these):
- lib/elevenlabs/calls.ts — ElevenLabs REST helpers: startOutboundCall({ toNumber, dynamicVariables }) using env.elevenLabsKey(), env.elevenLabsAgentId(), env.elevenLabsPhoneNumberId(); and any helper to fetch a conversation if useful. Typed, with clear errors. IMPORTANT FLAG: env ELEVENLABS_PHONE_NUMBER_ID currently holds a raw phone number ("+1984...") rather than the ElevenLabs phone-number id ("phnum_..."). Use the env getter as-is, but in code comments AND in your blockers note that the outbound call likely needs the phnum_ id from the ElevenLabs dashboard, and that Twilio trial only calls verified numbers and plays a greeting first.
- app/api/calls/trigger/route.ts — POST "Call me now" (the PRIMARY demo path). runtime 'nodejs'. requireUser() + getProfile for phone_e164 + display_name. Build dynamicVariables (user_id, display_name, recent_thread = a 1-line continuity hook from the user's most recent entry via searchEntries/db, for the callback open). Call startOutboundCall. Return JSON { ok, conversationId?, callSid? } or a calm error { ok:false, error } (e.g. no phone on file -> instruct to add it in onboarding). This is the contract Track D's call-me-now button calls (POST, no body needed; reads profile server-side).
- app/api/cron/daily/route.ts — GET, protected by CRON_SECRET (Vercel sends 'Authorization: Bearer <CRON_SECRET>'; verify against env.cronSecret(); 401 otherwise). Find users due for their daily call (for the demo: all profiles with a phone_e164; optionally compare daily_call_time to now in their timezone but keep it lenient given Hobby cron fires once daily UTC). Fire startOutboundCall for each (sequentially, guard failures). Return a summary JSON. Use createAdminClient or db (server) to read profiles.
- vercel.json — add a crons entry: { "crons": [{ "path": "/api/cron/daily", "schedule": "0 14 * * *" }] } (daily UTC; pick a reasonable hour). If vercel.json exists, MERGE don't clobber — but it does not exist, so create it.
- app/(app)/recap/page.tsx — WEEKLY RECAP view (server component, requireProfile). If a weekly summary exists for the current week, render it (markdown -> serif). Otherwise show a calm empty state AND a 'use client' button components/recap/generate-recap.tsx to generate one on demand (POST /api/recap/generate). Render like a reflective letter, not a report. Anti-metric.
- app/api/recap/generate/route.ts — POST. requireUser(). Gather the week's entries (db, scoped, last 7 days). ONE OpenAI call to synthesize a weekly recap in Socrates' restrained, non-appraising voice — surface recurring threads and tensions, hand meaning back to the person ("here's a pattern — what do you make of it?"), NEVER verdicts/praise/metrics. Insert a summaries row kind 'weekly' (period_start/end = the week). Return { ok, content }.
- components/recap/generate-recap.tsx — 'use client' button to trigger generation and show the result.

NOTE: do NOT create the today page or its call-me-now button (Track D owns those; you own the /api/calls/trigger route they call).
integrationNotes: state the /api/calls/trigger contract (POST, reads profile server-side, returns {ok,...}); the vercel.json cron; the recap route. BLOCKERS: clearly flag the ELEVENLABS_PHONE_NUMBER_ID phnum_ vs raw-number issue and the Twilio-trial verified-number caveat so the user can fix env before the live phone demo.`,
  },
]

const results = await parallel(
  TRACKS.map((t) => () =>
    agent(t.prompt, { label: t.label, phase: t.key, schema: TRACK_SCHEMA, agentType: 'general-purpose' }),
  ),
)

const ok = results.filter(Boolean)
log(`Tracks complete: ${ok.length}/${TRACKS.length} returned.`)
return { tracks: ok, missing: TRACKS.length - ok.length }
