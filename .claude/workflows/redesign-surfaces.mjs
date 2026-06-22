export const meta = {
  name: 'redesign-surfaces',
  description: 'Restyle every Socrates AI surface to "The Instrument" + re-message copy (parallel, file-disjoint)',
  phases: [
    { title: 'A · Landing + design lab' },
    { title: 'B · Auth + onboarding' },
    { title: 'C · Shell + Today' },
    { title: 'D · Bank' },
    { title: 'E · Conversation' },
    { title: 'F · Recap + summaries' },
  ],
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['track', 'filesModified', 'summary', 'integrationNotes', 'blockers'],
  properties: {
    track: { type: 'string' },
    filesModified: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    integrationNotes: { type: 'string' },
    blockers: { type: 'string' },
  },
}

const SHARED = `
PROJECT: Socrates AI — /Users/yancun/Documents/Projects/socrates_demo (branch redesign/instrument, Next.js 16 App Router + Tailwind v4). We just rebranded the FOUNDATION (tokens, fonts, identity components) to a new design language and need to restyle the surface pages + re-message copy to match. READ these first to absorb the new system:
- app/globals.css (the new tokens + utilities + keyframes)
- components/brand/{bust-mark,wordmark}.tsx (logo + Wordmark + StarMark + BlinkCursor)
- components/sky/breathing-star.tsx (the dot-matrix orb), components/sky/constellation.tsx (the dot-matrix field)
- components/ui/button.tsx (Button/LinkButton)

THE NEW DESIGN LANGUAGE — "THE INSTRUMENT": a scientific instrument / lab readout / refined terminal. LIGHT-FIRST, high contrast, clean hairline rules, plenty of whitespace, FIG.-style mono captions, tasteful command-line cues (a leading "›" or "$", a blinking cursor, FIG.01 labels, monospaced metadata), and a dot-matrix motif. Modern and minimal; terminal cues are the delight in the details, never kitsch.

SHARED CONTRACT (do NOT deviate):
- COLOR: one profound blue accent. Tokens/utilities are STABLE — use: bg-ink (the near-white PAPER ground), bg-raised / bg-raised-2 (surfaces), border-hairline / border-hairline-strong (rules), text-marble (near-black INK text), text-marble-dim (muted). Use text-accent / bg-accent / border-accent for the blue. (Legacy text-gold/variant="gold" still compile via alias and render blue, but PREFER accent in any edited line.) Gold is gone — there is exactly ONE accent (blue), RATIONED to one focal element per view.
- TYPE: font-sans = Geist (all UI + reading/body, summaries, chat, the person's words). font-mono-display = IBM Plex Mono (brand, titles, section labels, ids, timestamps, FIG captions, the wordmark). .label-mono utility = the FIG-caption style (uppercase, tracked, Plex). Headings (h1-h3) already render in Plex. font-serif now == Geist (reading) — fine to leave or switch to font-sans. Do NOT set long body copy in mono.
- COMPONENT APIs ARE FROZEN — import and use, never change signatures: Wordmark({className?,size?,href?,withStar?}), StarMark({size?,className?}), BlinkCursor({className?}), BustMark({size?,className?,title?}) [components/brand/*]; BreathingStar({state,level?,size?,className?}) + StarState [components/sky/breathing-star]; Constellation({stars,selectedId?,onSelect?,className?,igniteDuration?,interactive?,framed?}) [components/sky/constellation]; Button/LinkButton({variant:'gold'|'outline'|'ghost',size:'sm'|'md'|'lg',...}).
- REMOVE LEFTOVER GOLD GLOWS by hand (the color aliases to blue, but the GLOWS look wrong for a crisp instrument): delete/replace any \`glow-gold\` class, \`shadow-[...star-glow...]\`, gold radial-gradient inline styles, and \`text-[color:var(--gold)]\` → use text-accent or text-marble-dim. Replace warm radial vignettes that fade to var(--ink) — they still work (ink is now paper) but prefer clean hairline framing / faint dot-grid over big glows.
- ACCESSIBILITY: visible keyboard focus (global), respect prefers-reduced-motion (the primitives already do). DESKTOP-FIRST and downscale cleanly to mobile — EXCEPT the call/voice surface which stays MOBILE-FIRST (large thumb targets, full-bleed presence).
- ANTI-METRIC LAW: no counts-as-pressure, streaks, gamification anywhere.
- SOCRATIC VOICE in all copy: warm, dry, spare; Socrates is a midwife of thought (asks, mirrors, mostly stays quiet); NEVER flatters/gamifies.
- BIG-IDEA MESSAGING: lead with "an instrument for the examined life — it sharpens your OWN thinking" (AI aiding human cognition / midwife for wisdom). Move AWAY from "a voice that calls you / an AI you can talk to" — talking is just ONE feature; keep voice/call functional but SECONDARY (not the headline).

HARD RULES FOR YOU:
- Edit ONLY your track's allowlisted files (below). Do NOT touch app/globals.css, app/layout.tsx, proxy.ts, components/brand/*, components/sky/*, components/ui/*, components/theme/*, any lib/** (esp. lib/socrates/system-prompt.ts — OFF LIMITS), or any app/api/** route.
- Do NOT run npm/next/tsc/git or modify package.json. All deps are installed. The orchestrator integrates + builds.
- Write production-grade, fully-typed TSX that compiles. Match the new language. Keep all existing functionality/props/handlers intact — this is restyle + copy only.
- Return the structured summary.
`

phase('Restyle surfaces')

const TRACKS = [
  {
    key: 'A · Landing + design lab',
    label: 'A-landing',
    prompt: `${SHARED}

YOU ARE TRACK A — LANDING + DESIGN LAB.
ALLOWLIST (edit only these): app/page.tsx, app/design/page.tsx.

app/page.tsx — rebuild the landing as a MINIMAL, high-tech "instrument for thought" page (NOT "an AI you can talk to"):
- Lead with the big idea. Suggested hero (adapt, keep Socratic + spare): an eyebrow mono caption like \`> AN INSTRUMENT FOR THE EXAMINED LIFE\`; an h1 (Plex, large, tight) — "It doesn't hand you answers. / It sharpens your own." (second line in text-accent); a Geist sub-paragraph: "A thinking instrument modeled on the Socratic method — it draws out the half-formed thought, presses on your reasoning, and keeps the record of your mind as it moves. Speak it, or write it."
- Use the dot-matrix identity: render the <BustMark> prominently and/or a faint <Constellation interactive={false} framed={false}> dot-field backdrop (import SAMPLE_SKY from @/lib/sample-sky), and the <Wordmark> in the header. Keep the <BreathingStar> only if it fits as a quiet presence; the bust is the hero mark.
- Add a short, value-forward section or two on WHAT it is (a midwife for wisdom; aids cognition; the dialectic) — minimal, terminal-flavored (FIG. labels, hairline dividers, dot-grid), NOT feature-list-y. Voice/chat are mentioned as ways in, not the point.
- CTAs: primary "Begin" → /login (variant gold = accent); secondary "See the instrument" → /design (ghost/outline). Footer: a terminal readout (e.g. \`socrates --examine · v0.2\`) — no "Aegean Night"/constellation/gold language.
- Header nav: Wordmark + ThemeToggle + a "Design system" link to /design.
- Light-first; gorgeous in both themes; one accent focal; reduced-motion safe.

app/design/page.tsx — rewrite the /design lab to document the NEW system (it currently documents the old gold/serif system). Sections: a header with the new Wordmark; 01 Palette (paper/ink/one blue swatches via the tokens — show ink/raised/raised-2/hairline/hairline-strong/marble/marble-dim/accent/accent-strong; you may drop gold/cyan rows or note them as "→ accent alias"); 02 Typography (specimens: IBM Plex Mono for brand/labels via font-mono-display, Geist for body via font-sans, Geist Mono for data via font-mono — REMOVE the Fraunces/Spectral specimens); 03 Presence ("the dot-matrix orb" — keep the STAR_STATES buttons driving <BreathingStar>); 04 Signature ("the dot-matrix field" — <Constellation> with SAMPLE_SKY); 05 the wordmark/bust (show <BustMark> at 16/32/180 to prove legibility) + buttons. Keep it a real, working reference page.

integrationNotes: note the final hero copy used + any nav assumption.`,
  },
  {
    key: 'B · Auth + onboarding',
    label: 'B-auth',
    prompt: `${SHARED}

YOU ARE TRACK B — AUTH + ONBOARDING.
ALLOWLIST: app/login/page.tsx, app/onboarding/page.tsx, app/onboarding/onboarding-form.tsx.

Restyle to the instrument language; keep ALL auth logic/handlers/server-action wiring intact (signInWithOtp, the form fields display_name/timezone/daily_call_time/phone_e164, upsertProfile).
- login: clean, centered, light-first "terminal sign-in" — Wordmark, a spare Socratic invitation, a mono FIG label for the email field, a crisp accent "Send me a link" button. Replace the warm Constellation/glow backdrop with either nothing or a faint dot-field (<Constellation interactive={false} framed={false}> + SAMPLE_SKY) and remove the gold \`glow-gold\` Mail-icon circle → a clean hairline/accent treatment. Keep ?next + error states.
- onboarding: spare, instrument-styled form; mono labels, hairline inputs, accent focus, accent submit. Keep the warm Socratic copy ("Before we begin", "what should I call you?"), drop any gold-specific styling.
Both: input fields use border-hairline-strong, focus:border-accent (replace any hover/focus:border-gold — though alias works, prefer accent). Mobile-friendly.

integrationNotes: confirm no auth wiring changed.`,
  },
  {
    key: 'C · Shell + Today',
    label: 'C-shell-today',
    prompt: `${SHARED}

YOU ARE TRACK C — APP SHELL + TODAY.
ALLOWLIST: components/app/app-nav.tsx, app/(app)/today/page.tsx, components/today/call-me-now.tsx. (app/(app)/layout.tsx is likely a no-op; only touch it if strictly necessary — it is NOT in your allowlist, so leave it.)

- app-nav.tsx: keep links (Today/The bank/Chat/Recap) + ThemeToggle + sign-out + the "Talk now" entry. Restyle to a crisp instrument top bar (hairline border, paper bg, mono nav labels feel). The "Talk now" stays SECONDARY (outline, not the headline). Active link in text-accent. Keep the Wordmark.
- today/page.tsx: the daily readout. Warm Socratic greeting (keep time-of-day logic) in Geist/Plex; today's daily summary (if present) rendered as clean reading (Geist); recent thoughts as a precise list with .label-mono type+timestamp + Geist content. Re-message lightly so it's "your thinking" not "we talk". The CTA area: keep BOTH the in-browser "Talk now" (→/talk) and "Call me now" (call-me-now.tsx) but framed as ways to think out loud, secondary to the page's content — and consider adding a quiet "Write" link to /chat. Empty state: invitation in Socrates' voice, decoupled from voice ("The first time you think out loud here...").
- call-me-now.tsx: keep the POST /api/calls/trigger logic + all states EXACTLY. Restyle: remove the gold glow; primary accent button (or outline if you make "Talk" primary); calm status/error copy stays.
One accent focal on the Today page.

integrationNotes: note the CTA hierarchy you chose.`,
  },
  {
    key: 'D · Bank',
    label: 'D-bank',
    prompt: `${SHARED}

YOU ARE TRACK D — THE BANK.
ALLOWLIST: app/(app)/bank/page.tsx, components/bank/bank-view.tsx.

The bank is now "the field" (dot-matrix), not "the constellation/sky". Keep ALL data loading + the <Constellation> usage (it's now the dot-field, same props) + the sky/list toggle logic.
- Re-message: header label "THE FIELD OF YOUR THINKING" (mono), heading "The bank"; subtitle "Everything you've thought out loud, kept. Each thought a point; the threads you return to draw the rules between them." Toggle labels: "field" / "list" (was sky/list); swap the Sparkles icon → a dot-grid/lattice icon (lucide Grid3x3 or LayoutGrid). Empty state: "...each thought you work out becomes a point in the field — and over time, the pattern of your mind emerges." Hint: "Each dot is a thought. Rules connect what recurs. Select one to read it."
- LIST view: render as a precise commonplace LEDGER — .label-mono type + timestamp (Plex), Geist content, hairline rules between days. The search box (font-sans) on hairline. Keep client-side filtering.
- Remove any gold glows; selected/active = accent. The "your sky" readout → "the field" or similar; absolutely NO counts-as-pressure.
- Detail panel on select: clean card (border-hairline, bg-raised), .label-mono meta, Geist content.

integrationNotes: confirm Constellation + toggle still work.`,
  },
  {
    key: 'E · Conversation',
    label: 'E-convo',
    prompt: `${SHARED}

YOU ARE TRACK E — CHAT + TALK (CONVERSATION SURFACES).
ALLOWLIST: app/(app)/chat/page.tsx, components/chat/chat-client.tsx, app/(app)/talk/page.tsx, components/call/call-screen.tsx.

Keep ALL logic intact: chat SSE streaming to /api/llm/chat/completions, ensureChatSession/persistTurn, the useConversation/voice token flow, BreathingStar usage (now the dot-orb, same API).
- chat-client.tsx: a calm terminal-transcript. The person's words and Socrates' replies in Geist (font-sans) — readable, NOT mono. Mark Socrates' turns with the <StarMark> (now a dot glyph) and/or a mono "SOCRATES" label; a quiet "thinking" indicator (a small blinking cursor or a calm dot — NOT bouncing dots). FIX the gold leftovers: the error line \`text-[color:var(--gold)]/80\` → text-marble-dim; the inline gold BreathingDot/var(--gold) → accent. Composer: Geist textarea on hairline, accent send button, Enter/Shift+Enter preserved.
- chat/page.tsx: instrument header (mono eyebrow "› think out loud, in text", heading "Chat", spare Geist subtitle positioning writing as equal to speaking).
- call-screen.tsx (MOBILE-FIRST — keep it): full-bleed paper field, the <BreathingStar> dot-orb centered as Socrates' presence (large), one rationed accent primary "Talk to Socrates", large 56px+ round Mute/End controls, a calm .label-mono status line (aria-live). REMOVE the gold glow / warm radial vignette → clean paper + faint dot-grid + the blue orb. Live captions in Geist. Keep teardown + error copy.
- talk/page.tsx: keep the full-bleed breakout + requireProfile; minor copy.
One accent focal per surface; reduced-motion safe.

integrationNotes: confirm streaming + voice wiring untouched.`,
  },
  {
    key: 'F · Recap + summaries',
    label: 'F-recap',
    prompt: `${SHARED}

YOU ARE TRACK F — RECAP + SUMMARIES.
ALLOWLIST: app/(app)/recap/page.tsx, components/recap/render-recap.tsx, components/recap/generate-recap.tsx, components/summary/markdown.tsx.

Keep ALL logic: the /api/recap/generate POST flow, the generate button states, markdown rendering.
- recap/page.tsx: instrument header (mono "WEEKLY RECAP", heading "The week, reflected back."); the recap rendered as a reflective LETTER in Geist (readable), framed by hairlines + a FIG.-style date-range mono caption. Keep the empty state + "Gather the week" button (accent or outline).
- render-recap.tsx + summary/markdown.tsx: the markdown renderers — set body in Geist (font-sans), headings in Plex (font-mono-display) or just bold Geist, lists/quotes clean with hairline accents; remove any gold/serif-specific styling (font-serif now == Geist, fine; prefer explicit font-sans). Keep it dependency-free.
- generate-recap.tsx: restyle button + done-state to the instrument language; remove gold glows; accent.
Reflective, non-appraising, anti-metric (the prompt already guarantees the voice; just don't ADD metrics in chrome).

integrationNotes: confirm recap generation untouched.`,
  },
]

const results = await parallel(
  TRACKS.map((t) => () =>
    agent(t.prompt, { label: t.label, phase: t.key, schema: SCHEMA, agentType: 'general-purpose' }),
  ),
)

const ok = results.filter(Boolean)
log(`Surfaces restyled: ${ok.length}/${TRACKS.length}.`)
return { tracks: ok }
