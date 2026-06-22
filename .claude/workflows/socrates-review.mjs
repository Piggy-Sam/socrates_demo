export const meta = {
  name: 'socrates-review',
  description: 'Adversarial review of Socrates AI: identity, design, correctness, security',
  phases: [
    { title: 'Review' },
    { title: 'Triage & verify' },
  ],
}

const FINDINGS = {
  type: 'object',
  additionalProperties: false,
  required: ['dimension', 'findings'],
  properties: {
    dimension: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'file', 'issue', 'fix', 'confidence'],
        properties: {
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          file: { type: 'string', description: 'path:line' },
          issue: { type: 'string' },
          fix: { type: 'string', description: 'concrete, specific fix' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
  },
}

const TRIAGE = {
  type: 'object',
  additionalProperties: false,
  required: ['confirmed', 'dismissed', 'summary'],
  properties: {
    confirmed: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'area', 'file', 'issue', 'fix'],
        properties: {
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          area: { type: 'string' },
          file: { type: 'string' },
          issue: { type: 'string' },
          fix: { type: 'string' },
        },
      },
    },
    dismissed: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['issue', 'why'],
        properties: { issue: { type: 'string' }, why: { type: 'string' } },
      },
    },
    summary: { type: 'string' },
  },
}

const REPO = '/Users/yancun/Documents/Projects/socrates_demo'

const BASE = `You are reviewing the Socrates AI codebase at ${REPO} (branch build/socrates-ai). Socrates AI is a maieutic "midwife of thought" — a voice that helps a person reach their OWN clarity. READ SPEC.md (esp. §2 the identity, §9 the design system) as the standard. Read the actual files (app/**, components/**, lib/**). Report ONLY real, actionable issues with a concrete fix and a path:line. Do not invent problems; prefer precision over volume. Return the structured findings.`

phase('Review')

const DIMENSIONS = [
  {
    key: 'identity',
    label: 'review:identity',
    prompt: `${BASE}

DIMENSION: THE SOCRATIC SOUL (the most important review). SPEC §2 is law. Socrates ASKS, MIRRORS, stays QUIET; never flatters ("great idea!" BANNED); never volunteers verdicts/praise/evaluations; is almost always SHORTER than the person; opinions only on explicit request, handed back as questions; surfaces patterns but NEVER interprets them ("here's a pattern — what do you make of it?", never "here's why you do this"); NO metrics/streaks/gamification/engagement bait; built for its own obsolescence.

Audit EVERY place that puts words in Socrates' mouth or shapes his behavior:
- lib/socrates/system-prompt.ts (must be VERBATIM from SPEC §2 — flag ANY drift, softening, or omission).
- The OpenAI prompts in lib/pipeline/extraction.ts (entry/summary extraction) and app/api/recap/generate/route.ts (weekly recap): do they instruct a restrained, non-appraising, non-interpreting voice? Do summaries/recaps risk praise, verdicts, or "here's what this means about you"? Flag any prompt that could produce flattery, evaluation, metrics, or interpretation-of-the-person.
- ALL user-facing UI copy (greetings, empty states, button labels, captions, errors) across app/** and components/**: flag anything sycophantic, gamified, metric-y ("streak", "X days", counts-as-pressure), engagement-baity, assistant-eager, or that speaks from the app's side instead of the user's ("entries DB" vs "your thoughts"). The Today greeting especially — is it warm without praise/metrics?

For each: file:line, what violates the identity, and the exact better wording/instruction.`,
  },
  {
    key: 'design',
    label: 'review:design',
    prompt: `${BASE}

DIMENSION: DESIGN-LAW ADHERENCE (the project's stated #1 priority). SPEC §9 + app/globals.css define the system: Aegean-night teal ground + antique-gold glow; GOLD IS RATIONED (≤1 focal gold element per view — the primary action or Socrates' star; never on chrome/multiple CTAs); mono (.label-mono/font-mono, cyan) for technical readouts; serif (font-serif) for the user's words & Socrates' reflections (commonplace-book, not feed); sans for chrome. Anti-metric ethos as visual law. Empty states are invitations in Socrates' voice. Visible keyboard focus (global), prefers-reduced-motion respected (use useReducedMotion for any motion), desktop-first downscaling cleanly to mobile — EXCEPT the call/voice surface which is MOBILE-FIRST (large thumb targets ≥56px, full-bleed presence, one-handed).

Audit every page/component in app/** and components/** (today, bank+bank-view, chat, talk+call-screen, recap, login, onboarding, summary/markdown):
- Gold rationing: any view with 2+ gold focal elements, or gold on chrome?
- Type roles correct (serif for the person's words; mono for metadata; sans for chrome)?
- Any metric/streak/gamification/count-as-pressure leaking into the UI?
- Reduced-motion honored on every animation (motion components using useReducedMotion or the BreathingStar/Constellation which already do)?
- Keyboard focus reachable on all interactive elements; aria where needed?
- Responsive: does each desktop surface downscale without breaking? Is the call screen genuinely mobile-first with large touch targets?
- Does each surface feel unmistakably "the philosopher's instrument" (techy + academic), or generic? Flag bland/generic surfaces with a specific upgrade.

For each: file:line, the deviation, and the concrete fix.`,
  },
  {
    key: 'correctness',
    label: 'review:correctness',
    prompt: `${BASE}

DIMENSION: CORRECTNESS & ROBUSTNESS (server logic). Focus on real bugs, not style. Check:
- Next 16 App Router: route handler params typed/awaited as Promise; cookies()/headers() awaited; client/server boundaries ('use client' where hooks/browser APIs used; no server-only imports in client files; no secret env in client bundles).
- RLS/user scoping: every db read/write scoped by the authenticated user's id (the Drizzle pooler bypasses RLS, so missing userId filters = data leak). Check bank, today, chat actions, recap, voice token, calls/trigger.
- lib/pipeline/extraction.ts: the single OpenAI extraction call — is JSON parsed safely (response_format/json mode, guards against malformed output)? embeddings batched? themes upsert correct (no duplicate-key crash)? within 30s budget?
- app/api/recap/generate & cron/daily: correct date windows, CRON_SECRET check, graceful failure, no unbounded loops.
- app/(app)/chat: SSE parsing on the client (handles multi-line data, [DONE], partial chunks); persistence ordering.
- Voice token route and call-screen: token fetch error handling; teardown; no key leak to client.
- Error handling: do routes fail calm (no unhandled throws leaking 500 to users where avoidable)?

For each: file:line, the bug, the concrete fix. Mark severity by real user impact.`,
  },
  {
    key: 'security',
    label: 'review:security',
    prompt: `${BASE}

DIMENSION: SECURITY. Check:
- Secret exposure: ELEVENLABS_API_KEY, SUPABASE_SECRET_KEY, ELEVENLABS_LLM_SECRET, OPENAI_API_KEY, CRON_SECRET, ELEVENLABS_WEBHOOK_SECRET must NEVER reach the client bundle. Flag any import of lib/env.ts server getters or admin client into a 'use client' file, or any NEXT_PUBLIC_ misuse.
- Auth: brain dual-auth (constant-time bearer; cookie path), webhook HMAC (raw-body, constant-time), cron bearer, voice token requireUser, calls/trigger requireUser. Any bypass, any timing leak, any missing check?
- user_id trust: the brain trusts client-provided user_id on the bearer path (acceptable for demo) — note any place a user could read/write ANOTHER user's data via spoofed ids on the COOKIE path (must use the session user, never a client-supplied id).
- Input validation on POST bodies; redirect safety in /auth/callback (open-redirect via ?next — must be relative-only).
- RLS posture: confirm server pipeline uses the trusted client and app reads are user-scoped.

For each: file:line, the risk, the concrete fix. Severity by exploitability.`,
  },
]

const reviews = await parallel(
  DIMENSIONS.map((d) => () =>
    agent(d.prompt, { label: d.label, phase: 'Review', schema: FINDINGS, agentType: 'general-purpose' }),
  ),
)

const all = reviews.filter(Boolean)
const flat = all.flatMap((r) => (r.findings || []).map((f) => ({ ...f, dimension: r.dimension })))
log(`Collected ${flat.length} raw findings across ${all.length} dimensions.`)

phase('Triage & verify')

const triage = await agent(
  `${BASE}

You are the TRIAGE & VERIFY reviewer. Below are raw findings from four review agents (identity, design, correctness, security). For EACH finding: open the cited file and VERIFY it against the actual code — confirm it is real and the fix is correct, or DISMISS it (false positive, already handled, or stylistic noise). Dedupe overlapping findings. Then return a single prioritized list of CONFIRMED issues (high→low), each with a precise file, the issue, and a concrete fix that respects SPEC §2 (identity) and §9 (design). Be strict: only confirm what you verified in the code. Bias toward the project priorities — identity and design issues matter most, then correctness/security bugs.

RAW FINDINGS (JSON):
${JSON.stringify(flat, null, 2)}`,
  { label: 'triage', phase: 'Triage & verify', schema: TRIAGE, agentType: 'general-purpose' },
)

return triage
