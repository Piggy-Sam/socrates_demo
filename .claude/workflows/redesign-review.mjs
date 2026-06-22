export const meta = {
  name: 'redesign-review',
  description: 'Adversarial review of the redesign: design-law, identity/copy, functionality preservation, a11y',
  phases: [{ title: 'Review' }, { title: 'Triage & verify' }],
}

const FINDINGS = {
  type: 'object', additionalProperties: false,
  required: ['dimension', 'findings'],
  properties: {
    dimension: { type: 'string' },
    findings: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      required: ['severity', 'file', 'issue', 'fix', 'confidence'],
      properties: {
        severity: { type: 'string', enum: ['high', 'medium', 'low'] },
        file: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      },
    } },
  },
}
const TRIAGE = {
  type: 'object', additionalProperties: false,
  required: ['confirmed', 'dismissed', 'summary'],
  properties: {
    confirmed: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      required: ['severity', 'area', 'file', 'issue', 'fix'],
      properties: { severity: { type: 'string', enum: ['high','medium','low'] }, area: { type: 'string' }, file: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' } },
    } },
    dismissed: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['issue','why'], properties: { issue: { type: 'string' }, why: { type: 'string' } } } },
    summary: { type: 'string' },
  },
}

const REPO = '/Users/yancun/Documents/Projects/socrates_demo'
const BASE = `Review the Socrates AI REBRAND at ${REPO} (branch redesign/instrument). The new design language is "The Instrument": light-first scientific-instrument / refined-terminal — near-white paper, near-black ink, ONE profound blue accent (#0F62FE light / #4D7CFF dark), hairline rules, IBM Plex Mono for brand/titles/labels (font-mono-display / .label-mono) + Geist for UI & reading (font-sans), a dot-matrix motif (bust logo, dot-orb presence, dot field). Big idea: "an instrument for the examined life — it sharpens your OWN thinking" (NOT "a voice that calls you"). Read app/globals.css + components/{brand,sky,ui}/* for the system, then the surfaces. Compare against the previous commit if useful (git diff origin/main). Report ONLY real, actionable issues with a concrete fix + path:line. Return structured findings.`

phase('Review')
const DIMS = [
  { key: 'design', label: 'review:design', prompt: `${BASE}

DIMENSION: DESIGN-LAW ADHERENCE (the project's #1 priority). Audit every surface (app/page.tsx, app/design/page.tsx, app/login, app/onboarding/*, app/(app)/{today,bank,chat,talk,recap}/* and components/{app,bank,chat,call,recap,today,summary}/*). Flag:
- Leftover OLD identity: any remaining warm-gold GLOWS (glow-gold, shadow-[…star-glow…], gold radial-gradients), teal/cyan, serif (Fraunces/Spectral) language, "Aegean Night"/"constellation of your mind"/"sky" copy, or var(--gold) inline where it should be text-accent.
- Gold/accent rationing: any view with 2+ solid accent focal elements competing (only ONE primary accent per surface).
- Type roles: brand/labels/timestamps in Plex (font-mono-display/.label-mono); reading/body in Geist (font-sans); NO long body in mono.
- Instrument feel: is each surface unmistakably the new language (hairline rules, FIG/mono captions, dot-matrix, terminal cues) or did a surface stay bland/old? Flag bland surfaces with a concrete upgrade.
- Light-first correctness + both-theme legibility (contrast of marble-dim/hairline on paper).
For each: path:line, the deviation, the concrete fix.` },
  { key: 'identity', label: 'review:identity', prompt: `${BASE}

DIMENSION: IDENTITY & COPY. The soul (lib/socrates/system-prompt.ts) is OFF-LIMITS — don't touch, just ensure surfaces echo it. Audit ALL user-facing copy across the surfaces + metadata (app/layout.tsx). Flag:
- Copy still leading with "a voice that calls you" / "an AI you can talk to" instead of the cognition/midwife big idea. Voice/call must be SECONDARY, not the headline.
- Any flattery, gamification, metrics/streaks/counts-as-pressure, or assistant-eager tone. Socrates is a midwife: asks, mirrors, spare, never appraises.
- Empty states that aren't warm Socratic invitations; CTAs that over-emphasize calling.
For each: path:line, the offending copy, the better wording (keep it spare + Socratic).` },
  { key: 'functionality', label: 'review:functionality', prompt: `${BASE}

DIMENSION: FUNCTIONALITY PRESERVATION (this was a restyle — nothing should have broken). Verify via git diff that NO backend logic changed and the frozen component APIs are intact. Flag:
- ANY edit to app/api/**, lib/** (esp. lib/socrates/system-prompt.ts), proxy.ts, vercel.json — these must be untouched (lib/constellation.ts cosmetic-only is OK).
- Changed signatures/props of Wordmark/StarMark/BustMark/BreathingStar/StarState/Constellation/Button — must be unchanged.
- Broken wiring in restyled surfaces: chat SSE parse + ensureChatSession/persistTurn, voice useConversation/token flow + BreathingStar state mapping, call-me-now POST /api/calls/trigger states, recap generate flow, auth signInWithOtp + form field names (displayName/timezone/dailyCallTime/phoneE164) + upsertProfile, bank Constellation/toggle/search, theme toggle. Flag any handler/prop/state that was dropped or altered.
- Client/server boundary issues ('use client' where hooks/browser APIs used; no secret env in client).
For each: path:line, what broke, the fix.` },
  { key: 'a11y', label: 'review:a11y', prompt: `${BASE}

DIMENSION: ACCESSIBILITY & RESPONSIVE. Flag:
- prefers-reduced-motion: any new animation (blink cursor, dot-wave orb, dot-rise field, motion transitions) not gated for reduced motion (the primitives self-guard; check surface-level motion).
- Keyboard focus visibility on all interactive elements; aria-labels on icon-only buttons; aria-live on the call status.
- Contrast: marble-dim text / hairline on the new near-white paper and on dark navy — is body/caption text readable (WCAG AA-ish)?
- Responsive: desktop surfaces downscale cleanly to mobile (no overflow/cramping); the call screen (components/call/call-screen.tsx) is MOBILE-FIRST with ≥56px thumb targets and full-bleed presence.
For each: path:line, the issue, the concrete fix.` },
]
const reviews = (await parallel(DIMS.map((d) => () => agent(d.prompt, { label: d.label, phase: 'Review', schema: FINDINGS, agentType: 'general-purpose' })))).filter(Boolean)
const flat = reviews.flatMap((r) => (r.findings || []).map((f) => ({ ...f, dimension: r.dimension })))
log(`Collected ${flat.length} raw findings.`)

phase('Triage & verify')
const triage = await agent(`${BASE}

You are the TRIAGE & VERIFY reviewer. For EACH raw finding below, open the cited file and VERIFY it against the actual code — confirm real ones (with a correct, specific fix respecting the new design language + frozen APIs + the OFF-LIMITS system prompt) or DISMISS (false positive / already handled / stylistic noise). Dedupe. Return a single prioritized list (high→low). Bias toward design-law + identity issues (the project's priorities), then real functionality/a11y bugs.

RAW FINDINGS:
${JSON.stringify(flat, null, 2)}`, { label: 'triage', phase: 'Triage & verify', schema: TRIAGE, agentType: 'general-purpose' })
return triage
