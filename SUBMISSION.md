# Socrates AI

**Team:** Yancun Zhu (solo).

---

## Problem statement

**Theme A — AI Operating Layer · Challenge A.3 — Human agency in AI-mediated decisions.**

The challenge asks how we help people *understand, override, and shape* the decisions AI makes for them. But there is an upstream bottleneck: a person who has stopped thinking can't meaningfully shape anything — they have nothing of their own to override *with*. The real lever isn't another dashboard of explanations or controls; it's the **culture of our relationship with AI** — whether we still value and exercise our own cognition. Restore the habit of thinking, and agency follows.

---

## Target user

Two wedges:

1. **Individuals** who want their relationship with AI to make them *sharper* — to think ideas through, document their own cognition, and build on it over time, rather than quietly offloading it.
2. **Education** — institutional buyers (schools, boards, parents, governments) who want AI-literacy that *protects and develops* student thinking instead of eroding it.

---

## Solution summary

Socrates AI is a voice-and-text thinking partner that refuses to do your thinking for you. Instead of handing you answers, it presses your reasoning, keeps the record of ideas you actually worked out yourself, and resurfaces them over time — so AI sharpens human cognition instead of quietly replacing it.

---

## Demo video

▶ YouTube (≤3 min): **[PASTE LINK HERE]**

---

## Live demo / links

- **Live app:** https://socrates-demo-chi.vercel.app
- **In-site pitch deck:** https://socrates-demo-chi.vercel.app/pitch
- **See demo** — no sign-up required: a live, populated account you can explore freely (nothing you do is saved).
- **GitHub:** https://github.com/Piggy-Sam/socrates_demo

---

## Pitch deck

The deck is **built into the product** at [`/pitch`](https://socrates-demo-chi.vercel.app/pitch) — 10 slides, including a **live on-stage call** with Socrates. Press **⌘P** to export it as a PDF.

---

## Tools used

- **Next.js** (App Router) on **Vercel** — hosting, Cron (daily/weekly jobs), Fluid Compute.
- **OpenAI** — GPT-4o for the Socratic dialogue, distillation, and pattern detection; `text-embedding-3-small` for semantic memory.
- **ElevenLabs** Conversational AI — the voice agent, driven by a custom-LLM "brain."
- **Twilio** — outbound phone calls (the daily call).
- **Supabase** — Postgres + pgvector + Auth.
- **Drizzle ORM** — the typed data layer.

---

## Technical architecture (brief)

A custom-LLM endpoint (OpenAI Chat Completions wire format) serves the **Socratic system prompt** plus **RAG over the user's own entries** (pgvector / HNSW cosine ANN) and an **always-on standing-context memory**. Voice runs through **ElevenLabs** with a dynamic, personalized opener; one brain powers both the voice and text surfaces. Finished conversations are **distilled into typed entries** — `idea` / `opinion` / `feeling` / `observation` / `question` / `decision` — each embedded for semantic recall, **aggregated into themes**, **surfaced as patterns** (recurring / contradiction / abandoned, surfaced but never interpreted), and **folded into daily and weekly recaps**. A read-only **"See demo"** mode lets anyone explore a curated account while every write no-ops.

---

## Originality & insight

The stance is **anti-metric and maieutic**: no streaks, no counts, no gamification — a tool built to be *outgrown*. It restores agency *upstream*, by keeping cognition human rather than bolting controls onto decisions already made for you.

---

## Evidence of real demand

The seed was firsthand: judging a case competition where students defended **AI-generated theses they had never actually reasoned through** — confident, fluent, and unable to think past the prompt. That observation lines up with the emerging research on cognitive offloading documented at **brainonllm.com**.

---

## Judging-rubric alignment

| Rubric criterion | How Socrates AI maps to it |
| --- | --- |
| **Challenge–Solution Fit** | Reframes A.3 to its upstream lever — agency depends on a person who still thinks; Socrates rebuilds that habit. |
| **AI Leverage & Technical Execution** | Custom-LLM brain + pgvector RAG + standing memory; voice (ElevenLabs) and text on one brain; distillation, themes, patterns, recaps via Cron. |
| **Product Thinking & UI/UX** | "The Instrument" design language, frictionless no-sign-up demo, an in-site pitch deck with a live on-stage call. |
| **Originality & Insight** | Anti-metric, maieutic AI built to be outgrown — sharpening cognition instead of replacing it. |
| **Evidence of Real Demand** | Firsthand case-competition observation + the brainonllm.com line of cognitive-offloading research. |
