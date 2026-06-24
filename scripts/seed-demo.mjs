// Comprehensive, idempotent DEMO seed for a single user. Wipes that user's bank
// (patterns, summaries, themes, entries, messages, sessions — NOT the auth user)
// and rebuilds a rich, lived-in dataset: ~10 sessions of real Socratic dialogue,
// ~50 first-person embedded entries across recurring threads, aggregated themes,
// daily distillations, weekly recaps, and surfaced patterns. Designed to make a
// LIVE investor demo of "track + resurface past cognition" land.
//
// This is DESTRUCTIVE for the target user and is meant to be re-run safely
// (delete-then-seed). It does real OpenAI embedding calls and writes to the DB.
//
// Usage:
//   node scripts/seed-demo.mjs [userId]
//     userId defaults to the demo user below; must be a UUID if provided.
//
// Requires .env.local with:
//   DATABASE_URL          (Supabase pooler url; we derive the SESSION url, :5432)
//   OPENAI_API_KEY        (for 1536-dim embeddings)
//   OPENAI_EMBEDDING_MODEL (optional; defaults to text-embedding-3-small)
//   MIGRATE_URL           (optional; explicit session url override)
//
// It mirrors scripts/seed.mjs + scripts/migrate.mjs exactly: postgres SESSION
// url, prepare:false, max:1; vectors inserted as "[..]"::vector.

import postgres from "postgres";
import OpenAI from "openai";

process.loadEnvFile?.(".env.local");

// ── target user + guards ─────────────────────────────────────────────────────
const USER_ID = process.argv[2] || "c996ad01-7f17-4c11-8c1d-d65baf4249e3";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (!process.env.DATABASE_URL) {
  console.error("✗ DATABASE_URL is required (set it in .env.local). Aborting.");
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error("✗ OPENAI_API_KEY is required (set it in .env.local). Aborting.");
  process.exit(1);
}
if (!UUID_RE.test(USER_ID)) {
  console.error(`✗ USER_ID must be a UUID. Got: ${USER_ID}`);
  process.exit(1);
}

function sessionUrl() {
  if (process.env.MIGRATE_URL) return process.env.MIGRATE_URL;
  const u = new URL(process.env.DATABASE_URL);
  u.port = "5432"; // session mode (transaction mode is 6543)
  u.search = ""; // drop ?pgbouncer=true
  return u.toString();
}

const sql = postgres(sessionUrl(), { prepare: false, max: 1, idle_timeout: 20 });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMB_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

console.log("seed-demo — about to do the following:");
console.log(`  • target user: ${USER_ID}`);
console.log("  • DELETE all of that user's patterns/summaries/themes/entries/messages/sessions");
console.log("  • UPDATE (or insert) the profile: display_name=Yancun, tz=Asia/Singapore, daily_call_time=21:00 (phone preserved)");
console.log("  • SEED ~10 sessions, ~50 entries (embedded), themes, daily summaries, weekly recaps, patterns");
console.log("  • embedding model:", EMB_MODEL);
console.log("");

// ── helpers ──────────────────────────────────────────────────────────────────
// A spoken/chat turn for the transcript jsonb. Voice sessions store the RAW
// ElevenLabs shape ({ role: "user"|"agent", message, time_in_call_secs }); the
// call log reads exactly that. Messages rows map "agent" -> "socrates".
function turn(role, message, t) {
  return { role, message, time_in_call_secs: t };
}

// Build messages rows (role user|socrates, content) from raw turns.
function turnsToMessages(turns) {
  return turns
    .map((t) => {
      const role = t.role === "user" ? "user" : "socrates";
      const content = (t.message ?? "").trim();
      return content ? { role, content } : null;
    })
    .filter(Boolean);
}

// ── sessions: real Socratic dialogue across ~4 weeks ─────────────────────────
// `daysAgo` anchors started_at = now() - daysAgo days (at the local-ish hour).
// `durMin` sets ended_at. `type`: scheduled_call | on_demand_voice | chat.
// Voice/call sessions carry a transcript; chat sessions store transcript = null
// (matching the app: chat persists messages only). Each turns array is genuine
// dialogue — Socrates asks and presses, never lectures or hands down verdicts.
const SESSIONS = [
  // ── Week 4 (oldest): the flagship thread is first NOTICED ──────────────────
  {
    key: "s1",
    convId: "seed-01",
    type: "scheduled_call",
    daysAgo: 26,
    hour: 21,
    durMin: 14,
    turns: [
      turn("agent", "It's late there. What's still running in your head?", 2),
      turn(
        "user",
        "Something at lunch today bugged me. A junior asked the group chat to 'just generate' the reflection essay for our leadership course. And everyone did. Including the people I think of as the sharp ones.",
        9,
      ),
      turn(
        "agent",
        "What bugged you — that they used the tool, or that the sharp ones did?",
        21,
      ),
      turn(
        "user",
        "The second one, I think. I expected the lazy ones to offload it. But these are people who can actually think. They just... didn't see the point of doing it themselves.",
        35,
      ),
      turn(
        "agent",
        "Say more about 'the point.' From their side, the essay is a hoop. The grade is the same whether they wrote it or a model did. So what exactly did they skip that you wish they hadn't?",
        58,
      ),
      turn(
        "user",
        "The part where you find out what you actually think by writing it. I never know what I believe about something until I've tried to put it in a sentence and watched it fall apart.",
        82,
      ),
      turn(
        "agent",
        "So your worry isn't really about the essay. It's that the thing the essay was a proxy for — discovering your own mind on the page — gets quietly deleted, and nobody notices because the output looks fine. Is that it?",
        104,
      ),
      turn(
        "user",
        "Yeah. That's exactly it. The output looks fine. That's what scares me. There's no error message when you stop thinking.",
        121,
      ),
      turn(
        "agent",
        "Hold onto that line. One honest question before you sleep: is it possible they DID think, just not the way you do — talked it out, argued in the chat — and the essay was always the dead part? Or do you actually believe something was lost?",
        149,
      ),
      turn(
        "user",
        "...I don't know yet. I want to say something was lost. But I should be careful I'm not just nostalgic for my own way of doing it.",
        168,
      ),
      turn(
        "agent",
        "That's the honest place to stop. You've got a real claim and a fair doubt about it, both on the table. Sit with which one is louder tomorrow.",
        184,
      ),
    ],
  },
  {
    key: "s2",
    convId: "seed-02",
    type: "on_demand_voice",
    daysAgo: 24,
    hour: 14,
    durMin: 9,
    turns: [
      turn("agent", "You opened the line. What's pulling at you?", 2),
      turn(
        "user",
        "Direction stuff. ORD is coming, and everyone keeps asking what I'm doing after the army. I keep saying 'building something.' But when I say it out loud it sounds like a cope.",
        16,
      ),
      turn(
        "agent",
        "What would it have to look like for it to NOT sound like a cope — to you, not to them?",
        29,
      ),
      turn(
        "user",
        "If someone other than me used it and it changed how they thought. One real person. Not my mum being supportive.",
        44,
      ),
      turn(
        "agent",
        "That's a clean bar. Notice it's not money, not a title, not a number of users — it's one person whose thinking moved. Is that the bar you actually hold yourself to, or the one that sounds noble at 2pm on a call?",
        66,
      ),
      turn(
        "user",
        "Ha. Fair. I want it to be the real one. I think it mostly is. But I'd be lying if a part of me doesn't also want it to look impressive to the people I went to JC with.",
        86,
      ),
      turn(
        "agent",
        "Both can be true. The question that matters: if the impressive version and the one-person-changed version pulled in opposite directions — say, a flashy metric that didn't actually help anyone think — which way would you walk?",
        110,
      ),
      turn(
        "user",
        "I'd want to walk toward the real one. I'm not certain I would. That's the uncomfortable part.",
        126,
      ),
      turn(
        "agent",
        "Then that's the thing to watch — not to resolve today, but to catch yourself in the act of, the next time the choice is actually live.",
        142,
      ),
    ],
  },
  {
    key: "s3",
    convId: null, // chat session — transcript null, messages only
    type: "chat",
    daysAgo: 23,
    hour: 23,
    durMin: 18,
    turns: [
      turn(
        "user",
        "I keep reading about the replication crisis and it's making me trust science less, which feels like exactly the wrong lesson to take. Help me not become a crank.",
        0,
      ),
      turn(
        "agent",
        "Good instinct to flag it. Let's separate two things, because the crank move is to fuse them. One: a lot of published findings — especially in social psych and parts of biomed — don't replicate. That's real; the 2015 Open Science Collaboration reproduced under 40% of a hundred psych studies. Two: 'therefore science is broken.' The second doesn't follow from the first. What do you actually mean when you say you 'trust science less'?",
      ),
      turn(
        "user",
        "I guess I mean I don't know which individual results to believe anymore.",
        0,
      ),
      turn(
        "agent",
        "That's a much narrower and healthier claim than 'I trust science less.' You've discovered that a single splashy result is weak evidence — which is what a good scientist would also tell you. The crisis isn't that the method failed; it's that incentives — publish-or-perish, novelty over replication, p-hacking — rewarded noise. The method is what's CATCHING it. Does the thing you distrust live in the method, or in the incentives bolted onto it?",
      ),
      turn(
        "user",
        "The incentives. Okay. That reframes it. It's not that truth-seeking is broken, it's that we built a career structure that pays for the appearance of discovery.",
        0,
      ),
      turn(
        "agent",
        "Now hear yourself. 'A structure that pays for the appearance of discovery.' Where else have you said something with that exact shape this month?",
      ),
      turn(
        "user",
        "...the AI essay thing. Students fluent at the appearance of thinking. Same disease.",
        0,
      ),
      turn(
        "agent",
        "Same disease, different host. You're circling a real thesis: when you reward the legible output instead of the hidden process, you get optimized fakes. Don't let me name it for you, though — what's YOUR sentence for the thing these two have in common?",
      ),
      turn(
        "user",
        "Something like: every proxy eventually gets gamed, and the gaming looks like success until you check the thing the proxy was standing in for. Goodhart, basically, but I want my own version.",
        0,
      ),
      turn(
        "agent",
        "Then keep it as yours and keep testing it against cases that DON'T fit — that's how you find out where the idea ends. Where's one place a proxy got gamed and it... actually turned out fine?",
      ),
    ],
  },

  // ── Week 3: the framing SHARPENS, plus society/science takes + personal ────
  {
    key: "s4",
    convId: "seed-04",
    type: "scheduled_call",
    daysAgo: 19,
    hour: 21,
    durMin: 16,
    turns: [
      turn("agent", "Last week you were circling whether something was lost when your peers offload the writing. Did it settle?", 3),
      turn(
        "user",
        "It sharpened. I think the grade isn't the disease. The grade is the symptom. The disease is that we made school a game where the move that wins is to look like you learned, not to learn. AI just gave everyone a cheat code for a game that was already rotten.",
        30,
      ),
      turn(
        "agent",
        "That's a real upgrade from last week. But let me press the 'already rotten' part. Plenty of people went through that same game and came out able to think. If the game is rotten, why didn't it rot them?",
        54,
      ),
      turn(
        "user",
        "Because they did the real thing anyway? They used the assignments as an excuse to actually think, even though the system didn't require it.",
        72,
      ),
      turn(
        "agent",
        "So the system tolerated real learning as an optional side effect, and some people opted in. Here's the uncomfortable follow-up: the cheat code doesn't FORCE anyone to stop opting in. It just makes opting in cost more relative to the reward. So is the problem the tool, or is it that we never made the real thing the thing that's rewarded?",
        98,
      ),
      turn(
        "user",
        "...the second. God. It was always the incentive. The AI is just the most efficient solvent for a bond that was already weak. If the only thing holding you to real thinking was friction, and the friction goes to zero, of course it dissolves.",
        122,
      ),
      turn(
        "agent",
        "You just said something you didn't say last week. Last week it was 'something is lost.' This week it's 'the only thing holding the bond was friction.' That's a sharper and bleaker claim. Do you believe the bleak version, or did you get carried by the momentum of the argument?",
        148,
      ),
      turn(
        "user",
        "I half believe it. I want there to be people for whom the bond is real and not just friction. I'm one of them, I think. But I can't tell if that's true or if I just like believing it about myself.",
        170,
      ),
      turn(
        "agent",
        "Then the test isn't an argument, it's behaviour: watch what you do the next time the friction on real thinking drops to zero for YOU. That's the only place this question gets answered honestly. We'll leave it there.",
        196,
      ),
    ],
  },
  {
    key: "s5",
    convId: "seed-05",
    type: "on_demand_voice",
    daysAgo: 17,
    hour: 16,
    durMin: 11,
    turns: [
      turn("agent", "What's on the table?", 1),
      turn(
        "user",
        "I want to argue about climate, but not the usual way. I'm sick of the doom and I'm sick of the techno-optimist 'just build reactors bro' thing too. Both feel like vibes.",
        18,
      ),
      turn(
        "agent",
        "Then let's not do vibes. Pick the actual claim you want to defend. 'Degrowth is a dead end,' 'nuclear is non-negotiable,' something with an edge I can push on.",
        34,
      ),
      turn(
        "user",
        "Okay: I think degrowth is morally serious but politically a fantasy, and that the honest path is abundance — make clean energy so cheap that decarbonizing is the path of least resistance, not a sacrifice you have to guilt people into.",
        56,
      ),
      turn(
        "agent",
        "That's a position with teeth. The strongest counter, so you don't get to keep it for free: 'cheap and abundant' is exactly the story we told about fossil fuels, and abundance drove consumption through the roof — Jevons paradox. Cheap clean energy might just mean we use vastly more of everything. Why doesn't that sink your view?",
        84,
      ),
      turn(
        "user",
        "Because the thing we're trying to cut is emissions, not energy use. If the abundant energy is clean, then more of it isn't the problem — using more clean kWh to desalinate water or run direct air capture is fine. Jevons is a problem when the cheap thing is dirty.",
        112,
      ),
      turn(
        "agent",
        "Decent rebuttal. But land use, materials, mining for all that capacity — the footprint isn't only carbon. Are you smuggling 'clean' as if it means 'free of all consequence'?",
        134,
      ),
      turn(
        "user",
        "Yeah, I am, a bit. I should say it narrower. Abundance solves the CARBON problem and creates new, smaller problems I'd rather have. Mining lithium is a worse trade than burning coal? I don't buy it. But I shouldn't pretend the trade is zero.",
        160,
      ),
      turn(
        "agent",
        "That's the honest version of your view, and it's stronger for the concession. You went from a slogan to a position you could actually defend to someone who disagrees. Good place to stop.",
        180,
      ),
    ],
  },
  {
    key: "s6",
    convId: null,
    type: "chat",
    daysAgo: 16,
    hour: 1,
    durMin: 12,
    turns: [
      turn(
        "user",
        "It's 1am and I miss my dad and I don't really want to make it deep, I just wanted to say it to something.",
        0,
      ),
      turn(
        "agent",
        "Then you don't have to make it deep. You said it. What brought him up tonight — anything, or just the hour?",
      ),
      turn(
        "user",
        "He used to leave for work before I woke up and I'd find these little notes on the kitchen table. Stupid stuff. 'Eat breakfast.' 'Don't be late.' I found one in an old book today.",
        0,
      ),
      turn(
        "agent",
        "That's not stupid stuff. That was a man saying he was thinking about you while you slept, in the only register he had. You don't need me to do anything with that. Is the note something you want to keep saying, or is this enough?",
      ),
      turn(
        "user",
        "This is enough. I think I just needed to not be the only one who knew the note existed.",
        0,
      ),
      turn(
        "agent",
        "Now two of us know. Goodnight, Yancun.",
      ),
    ],
  },

  // ── Week 2: the flagship collides with his OWN ambition ────────────────────
  {
    key: "s7",
    convId: "seed-07",
    type: "scheduled_call",
    daysAgo: 11,
    hour: 21,
    durMin: 17,
    turns: [
      turn("agent", "You've spent three weeks indicting the system for rewarding the appearance of thinking over the real thing. I want to turn that lens around. Is there a version of you building Socrates AI that does the exact thing you're criticizing?", 4),
      turn(
        "user",
        "Oof. Okay. Go on, I walked into that.",
        14,
      ),
      turn(
        "agent",
        "Investors want a number. The number that's easy to move is engagement — minutes, streaks, daily actives. If you optimize for that, you'd be building a thing that makes people FEEL like they're thinking, measured by time-on-app, while the real thing — them needing you less — would look like failure on your own dashboard. So: what stops you from becoming the disease you diagnosed?",
        38,
      ),
      turn(
        "user",
        "Honestly? Mostly that I'd hate myself. Which is not a business model. The whole point is that it's built for its own obsolescence — if it's working, you should need it less over time, not more. But that's the worst possible thing to put on a pitch deck.",
        64,
      ),
      turn(
        "agent",
        "Right. So you've designed a product whose success metric is invisible to the people who'd fund it, and whose legible metrics actively reward the betrayal of its purpose. That's not a footnote — that's the central tension of the whole thing. How do you even know it's working, if you refuse the metrics that would tell a funder it's working?",
        92,
      ),
      turn(
        "user",
        "That's the question I can't answer cleanly. I think... I'd know it's working if people quoted their OWN past thoughts back to themselves. If the thing surfaced something they said three weeks ago and it changed what they did today. Not 'time in app.' 'A past version of you talked you into something.'",
        122,
      ),
      turn(
        "agent",
        "Hold that — 'a past version of you talked you into something.' That's a real signal and it's not vanity engagement; someone can do that and then close the app for a week. But be ruthless with yourself: could you fake even THAT? Could you juice 'resurfaced and acted on it' the way people juice everything else?",
        152,
      ),
      turn(
        "user",
        "...probably. If I tried. I could nudge, I could notify, I could manufacture the resurfacing. The only real defense is that I'd know I was doing it. Which means the thing protecting the product from rot is just... my own integrity. That's terrifying as a foundation.",
        178,
      ),
      turn(
        "agent",
        "It is. And notice you've arrived, from the other direction, at the exact thing you said about your peers in week one: when the only thing holding the bond is the person choosing it, and not the structure forcing it, the whole thing rests on whether they keep choosing. You're now on the inside of your own argument. That's not a problem to solve tonight. It's the thing to never stop watching.",
        208,
      ),
      turn(
        "user",
        "Yeah. The thing I'm most afraid of in other people is the thing I have the most power to do. Cool. Great. Love that for me.",
        222,
      ),
      turn(
        "agent",
        "It's the most honest place you've gotten to in a month. Sleep.",
        232,
      ),
    ],
  },
  {
    key: "s8",
    convId: "seed-08",
    type: "on_demand_voice",
    daysAgo: 9,
    hour: 15,
    durMin: 10,
    turns: [
      turn("agent", "Go.", 1),
      turn(
        "user",
        "Product decision. The anti-metric thing — I keep wanting to add SOME signal so people feel oriented. A gentle 'here's what you worked on this week.' But every time I design it, it starts to smell like a streak. Where's the line?",
        20,
      ),
      turn(
        "agent",
        "What's the difference, mechanically, between a recap that orients and a streak that hooks? Not the vibe — the mechanism.",
        34,
      ),
      turn(
        "user",
        "A streak rewards CONTINUITY. It punishes the gap. The shame of breaking it is the whole engine. A recap could just... reflect what was there, and say nothing about the days you didn't show up. No number that goes down when you rest.",
        58,
      ),
      turn(
        "agent",
        "So the test is: does the surface ever make the user feel WATCHED for absence? If skipping three days produces any artifact — a broken chain, a guilt nudge, a '0' — it's a streak in a nice coat. If absence is simply silent, it's a mirror. Does your weekly recap pass that?",
        86,
      ),
      turn(
        "user",
        "It passes if I never count days. Only thoughts. The recap is about what you thought, never about how often you came. Okay. That's the rule. 'Never count the days, only the thinking.' I can hold that line.",
        110,
      ),
      turn(
        "agent",
        "Then you have a design principle that falls straight out of your own ethics, not a UX trend. Write it on the wall. What else in the product secretly counts days?",
        130,
      ),
      turn(
        "user",
        "...the daily call, kind of. I'll audit it. Good catch.",
        142,
      ),
    ],
  },
  {
    key: "s9",
    convId: null,
    type: "chat",
    daysAgo: 7,
    hour: 22,
    durMin: 14,
    turns: [
      turn(
        "user",
        "A friend and I are drifting. We don't fight, we just text less, and the texts got logistical. 'You alive?' 'Haha yeah busy.' I don't know if I should make it a thing or let it be.",
        0,
      ),
      turn(
        "agent",
        "Before the should — what do you actually want here? Not what a good friend is supposed to do. What you want.",
      ),
      turn(
        "user",
        "I want the version of us where we'd talk for three hours about nothing. But I also know people change and maybe that version is just over and I'm being sentimental.",
        0,
      ),
      turn(
        "agent",
        "Two real possibilities, and you've stated both fairly. Here's a distinction that might help: is the three-hours-about-nothing thing gone because YOU two changed, or because the conditions changed — you had endless time in JC and now you don't? Those have very different prognoses.",
      ),
      turn(
        "user",
        "...conditions, mostly. We're both just busy and tired. When we do talk it's still good. It's just rare.",
        0,
      ),
      turn(
        "agent",
        "Then the friendship may not be drifting — the SURFACE for it disappeared. You lost the empty afternoons, not each other. That's a logistics problem wearing the costume of an emotional one. What's the smallest thing that would test whether the good is still there when you make the surface on purpose?",
      ),
      turn(
        "user",
        "Just call him. Not text. A real call, on a walk, no agenda. If it's still three hours, I have my answer. If it's awkward, I have a different answer.",
        0,
      ),
      turn(
        "agent",
        "Then you don't have a decision to agonize over — you have an experiment to run. Let the call tell you, not the worrying.",
      ),
    ],
  },

  // ── Week 1 (most recent): keep /today and the current week populated ───────
  {
    key: "s10",
    convId: "seed-10",
    type: "scheduled_call",
    daysAgo: 2,
    hour: 21,
    durMin: 15,
    turns: [
      turn("agent", "You've been on this AI-and-learning thread for a month. Tonight, not the diagnosis — what do you actually think genuine learning IS, if you had to build for it?", 3),
      turn(
        "user",
        "I think genuine learning is when your model of something changes and you can FEEL the change. There's a click. Before, a thing confused you; after, it's obvious and you can't even reconstruct your old confusion. AI can hand you the answer, but it can't hand you the click. The click only happens if you carried the confusion yourself.",
        32,
      ),
      turn(
        "agent",
        "That's the sharpest you've put it. 'It can't hand you the click.' But now the hard part for a builder: a tool that just withholds answers to FORCE the struggle would be sadistic and people would hate it. So what's the move? How do you build a thing that makes the click MORE likely without doing the carrying for them?",
        62,
      ),
      turn(
        "user",
        "You don't withhold. You... slow them down at the right moment. You ask the question that makes them notice they don't actually understand the thing they thought they understood. The gap is the fuel. Most tools rush to close the gap. The good move is to make the gap VISIBLE and let them sit in it long enough to want to close it themselves.",
        96,
      ),
      turn(
        "agent",
        "You realize you just described what I'm trying to do to you right now. Is that a coincidence, or is that the whole product?",
        112,
      ),
      turn(
        "user",
        "...that's the whole product. Huh. I think I've been building a description of the thing I want to exist for a month without saying it plainly. It's not an answer machine. It's a gap-revealer. It makes you notice the edge of your own understanding and refuses to step over it for you.",
        140,
      ),
      turn(
        "agent",
        "Then say it plainly and keep it: an instrument, not an oracle. It doesn't give you the click — it makes the gap where the click can happen. Anything in the current build betray that?",
        162,
      ),
      turn(
        "user",
        "The RAG. Right now when it surfaces a past thought it's a bit too eager, like it's showing off that it remembered. It should surface the past thought as a QUESTION — 'you said this three weeks ago; does it still hold?' — not as a trophy. Make memory a gap-revealer too, not a party trick.",
        190,
      ),
      turn(
        "agent",
        "That's a real, shippable change that comes straight from your own definition of learning. You came in with a diagnosis and you're leaving with a design rule. We can stop.",
        210,
      ),
    ],
  },
  {
    key: "s11",
    convId: "seed-11",
    type: "on_demand_voice",
    daysAgo: 0,
    hour: 11,
    durMin: 8,
    turns: [
      turn("agent", "Morning. Something small or something big?", 1),
      turn(
        "user",
        "Small and good, for once. I read a paragraph of Marilynne Robinson on the bus and had to put the phone down and just look out the window for two stops. I forgot reading could do that. I've been reading like I'm clearing a backlog.",
        20,
      ),
      turn(
        "agent",
        "'Reading like I'm clearing a backlog.' That's a whole diagnosis in six words. What was different about the bus this morning that let the paragraph actually land?",
        38,
      ),
      turn(
        "user",
        "I wasn't trying to get anywhere with it. No notes, no highlighting, no thought of using it. I think the attention economy trained me to extract from everything. That paragraph was useless to me and that's exactly why it got through.",
        64,
      ),
      turn(
        "agent",
        "So the deep-reading you keep mourning isn't gone — it just can't survive being instrumentalized. The moment it has to be USEFUL, it dies. Does that change anything about how you want to spend a morning?",
        86,
      ),
      turn(
        "user",
        "Yeah. I want to protect some reading that I'm not allowed to use for anything. No notes. No turning it into a tweet or a feature idea. Useless on purpose. That's the opposite of everything I've optimized and that's the point.",
        108,
      ),
      turn(
        "agent",
        "Then guard it like you'd guard the thing you tell other people to protect. Go look out the window.",
        122,
      ),
    ],
  },
];

// ── entries: ~50, all first-person, the PERSON's own words ───────────────────
// `s` links to a session key; `daysAgo` dates it. Themes are lowercase.
const ENTRIES = [
  // ---- AI & EDUCATION (flagship) — evolving across weeks ----
  { s: "s1", daysAgo: 26, type: "observation", themes: ["ai & learning"], content: "The sharp ones offloaded the reflection essay too. Not the lazy ones — the people I think can actually think. They just didn't see the point of doing it themselves." },
  { s: "s1", daysAgo: 26, type: "feeling", themes: ["ai & learning"], content: "There's no error message when you stop thinking. The output looks fine. That's the part that scares me." },
  { s: "s1", daysAgo: 26, type: "idea", themes: ["ai & learning", "writing"], content: "I never know what I believe until I've tried to put it in a sentence and watched it fall apart. That's the thing the essay was a proxy for, and it's the part that gets quietly deleted." },
  { s: "s4", daysAgo: 19, type: "opinion", themes: ["ai & learning", "incentives"], content: "The grade isn't the disease. The grade is the symptom. The disease is that we made school a game where the winning move is to LOOK like you learned, not to learn." },
  { s: "s4", daysAgo: 19, type: "idea", themes: ["ai & learning", "incentives"], content: "AI is the most efficient solvent for a bond that was already weak. If the only thing holding you to real thinking was friction, and the friction goes to zero, of course it dissolves." },
  { s: "s4", daysAgo: 19, type: "question", themes: ["ai & learning"], content: "Do I actually believe the bleak version — that the bond to real thinking was only ever friction — or did I just get carried by the momentum of my own argument?" },
  { s: "s10", daysAgo: 2, type: "idea", themes: ["ai & learning"], content: "Genuine learning is when your model changes and you can FEEL the change. There's a click. AI can hand you the answer but it can't hand you the click — the click only happens if you carried the confusion yourself." },
  { s: "s10", daysAgo: 2, type: "idea", themes: ["ai & learning", "the product"], content: "Don't withhold answers — that's just sadistic. The move is to make the GAP visible and let them sit in it long enough to want to close it themselves. Most tools rush to close the gap. The good one reveals it." },
  { s: "s10", daysAgo: 2, type: "decision", themes: ["ai & learning", "the product"], content: "An instrument, not an oracle. It doesn't give you the click — it makes the gap where the click can happen. That's the whole thing. Write it on the wall." },

  // ---- HIS OWN DIRECTION ----
  { s: "s2", daysAgo: 24, type: "feeling", themes: ["direction"], content: "ORD is coming and everyone asks what I'm doing after. I keep saying 'building something' and when I say it out loud it sounds like a cope." },
  { s: "s2", daysAgo: 24, type: "decision", themes: ["direction", "the product"], content: "My bar for whether this was worth it: one real person, who isn't my mum, uses it and it changes how they think. Not money, not a title, not user counts. One mind that moved." },
  { s: "s2", daysAgo: 24, type: "feeling", themes: ["direction", "ambition"], content: "I'd be lying if part of me didn't also want it to look impressive to the people I went to JC with. I want the noble bar to be the real one. I'm not certain it always is." },
  { s: "s7", daysAgo: 11, type: "feeling", themes: ["direction", "ambition", "integrity"], content: "The thing I'm most afraid of in other people — optimizing for the legible fake over the real thing — is the thing I have the most power to do myself. The only real defense is that I'd know I was doing it." },
  { s: "s9", daysAgo: 7, type: "feeling", themes: ["direction", "impostor"], content: "Some mornings the whole thing feels like a kid playing founder. Then someone says one true sentence back to me from a call and I remember it's real. The impostor feeling is loudest right before it's least true." },
  { s: null, daysAgo: 13, type: "question", themes: ["direction"], content: "Is the 'safer path' actually safer, or just more legible to other people? A salaried job I'd resent is not the low-variance option it looks like." },
  { s: null, daysAgo: 21, type: "opinion", themes: ["direction", "ambition"], content: "Ambition without a clear idea of what 'enough' looks like is just a treadmill someone else built. I want ambition pointed at a thing, not at being seen as ambitious." },

  // ---- BUILDING SOCRATES AI ----
  { s: "s7", daysAgo: 11, type: "idea", themes: ["the product", "anti-metric"], content: "The success metric is invisible to the people who'd fund it. If it's working you need it LESS over time, not more. Built for its own obsolescence is the worst possible thing to put on a pitch deck and the truest thing about it." },
  { s: "s7", daysAgo: 11, type: "idea", themes: ["the product"], content: "I'd know it's working if people quoted their OWN past thoughts back to themselves — if a past version of you talked you into something today. Not time-in-app. A past you, resurfaced, changing a present you." },
  { s: "s8", daysAgo: 9, type: "decision", themes: ["the product", "anti-metric"], content: "Never count the days, only the thinking. A streak rewards continuity and punishes the gap — the shame of breaking it is the engine. A mirror just reflects what was there and says nothing about the days you didn't show up." },
  { s: "s8", daysAgo: 9, type: "idea", themes: ["the product", "anti-metric"], content: "The test for any surface: does it ever make the user feel WATCHED for absence? If skipping three days produces an artifact — a broken chain, a guilt nudge, a 0 — it's a streak in a nice coat." },
  { s: "s10", daysAgo: 2, type: "decision", themes: ["the product"], content: "Make memory a gap-revealer, not a party trick. When the RAG surfaces a past thought it should arrive as a question — 'you said this three weeks ago; does it still hold?' — not as a trophy that shows off it remembered." },
  { s: null, daysAgo: 15, type: "idea", themes: ["the product"], content: "The midwife metaphor is load-bearing, not decoration. The whole product is the refusal to deliver the baby for you. Every feature should be asked: does this help them deliver it, or does it deliver it for them?" },
  { s: null, daysAgo: 20, type: "opinion", themes: ["the product", "anti-metric"], content: "Most 'thinking' apps are productivity apps wearing a turtleneck. They count, they nudge, they gamify reflection until reflection becomes another thing to be behind on. I'd rather ship something quiet that you can disappear from without guilt." },
  { s: null, daysAgo: 8, type: "question", themes: ["the product"], content: "What's the smallest version of this that still has a soul? Every cut I'm tempted to make for the demo, I have to check it isn't cutting the part that makes it not-a-chatbot." },

  // ---- SOCIETY & SCIENCE ----
  { s: "s3", daysAgo: 23, type: "idea", themes: ["incentives", "science"], content: "My own Goodhart: every proxy eventually gets gamed, and the gaming looks like success until you check the thing the proxy was standing in for. The replication crisis and the AI-essay thing are the same disease in different hosts." },
  { s: "s3", daysAgo: 23, type: "opinion", themes: ["science", "incentives"], content: "The replication crisis isn't proof the method failed — it's the method CATCHING the rot. What failed is the career structure that paid for the appearance of discovery. Don't mistake the immune response for the disease." },
  { s: "s5", daysAgo: 17, type: "opinion", themes: ["climate", "energy"], content: "Degrowth is morally serious but politically a fantasy. The honest path is abundance: make clean energy so cheap that decarbonizing is the path of least resistance, not a sacrifice you have to guilt people into." },
  { s: "s5", daysAgo: 17, type: "idea", themes: ["climate", "energy"], content: "Jevons is a problem when the cheap thing is dirty. If the abundant energy is clean, more of it isn't the catastrophe — running desalination or direct air capture on cheap clean kWh is fine. But I shouldn't pretend the trade is zero; mining and land use are real, just smaller problems I'd rather have." },
  { s: "s11", daysAgo: 0, type: "observation", themes: ["attention", "reading"], content: "The attention economy trained me to extract from everything. That paragraph this morning was useless to me, and that's exactly why it got through. Deep reading can't survive being instrumentalized." },
  { s: "s11", daysAgo: 0, type: "decision", themes: ["attention", "reading"], content: "I'm going to protect some reading I'm not allowed to use for anything. No notes, no turning it into a feature idea or a tweet. Useless on purpose. The opposite of everything I've optimized, and that's the point." },
  { s: null, daysAgo: 18, type: "opinion", themes: ["attention", "mental health"], content: "We ran an unconsented experiment on teenagers with engineered dopamine and we're acting surprised by the results. The honest version isn't 'phones bad' — it's that a few companies' growth metrics got to redesign childhood, and no one chose that." },
  { s: null, daysAgo: 14, type: "opinion", themes: ["science", "longevity"], content: "Most longevity content is hope laundered into supplements. The real work — metabolic biology, senescence, the boring slow trials — doesn't trend because it can't promise you anything by Friday. The hype is downstream of impatience." },
  { s: null, daysAgo: 12, type: "opinion", themes: ["cities", "attention"], content: "Walkable cities are an attention argument, not just an urbanist one. A street you can walk lets your mind wander; a stroad you have to drive demands all of it. We designed places that leave no room to think and then wondered why no one thinks." },
  { s: null, daysAgo: 22, type: "opinion", themes: ["science", "incentives"], content: "Open science is the obvious fix and it's slow for the same reason everything is slow — the people who'd benefit aren't the people who hold the power, and prestige is a currency that resists being made free." },
  { s: null, daysAgo: 10, type: "question", themes: ["ai", "incentives"], content: "AI doomerism and accelerationism are both ways of not having to do the boring middle thing: build the specific safeguards for the specific harms in front of us. Is the apocalypse framing, in either direction, just a way to skip the unglamorous work?" },
  { s: null, daysAgo: 6, type: "opinion", themes: ["attention", "productivity"], content: "Productivity should mean 'did the thing that mattered get done,' not 'how many things got done.' We measure motion because it's countable and meaning isn't. The whole genre is an elaborate way of avoiding the one hard thing you already know you're avoiding." },

  // ---- PERSONAL (the 40%) ----
  { s: "s6", daysAgo: 16, type: "feeling", themes: ["home", "family"], content: "Found one of my dad's old notes in a book today. 'Eat breakfast.' He used to leave for work before I woke up. A man saying he was thinking about me while I slept, in the only register he had." },
  { s: "s6", daysAgo: 16, type: "observation", themes: ["home", "family"], content: "At 1am I didn't want it to be deep. I just needed to not be the only one who knew the note existed. Now two of us know. That was enough." },
  { s: "s9", daysAgo: 7, type: "observation", themes: ["friendship"], content: "Me and an old friend stopped drifting and started doing logistics. 'You alive?' 'Haha yeah busy.' The texts went from three hours about nothing to status pings." },
  { s: "s9", daysAgo: 7, type: "idea", themes: ["friendship"], content: "We didn't lose each other — we lost the SURFACE for it. The empty afternoons are gone, not the friendship. It's a logistics problem wearing the costume of an emotional one. So make the surface on purpose: call, on a walk, no agenda, and let it tell me." },
  { s: "s11", daysAgo: 0, type: "feeling", themes: ["reading", "joy"], content: "Read a paragraph of Marilynne Robinson on the bus and had to put the phone down and look out the window for two stops. Forgot reading could do that. I've been reading like I'm clearing a backlog." },
  { s: null, daysAgo: 5, type: "feeling", themes: ["burnout", "rest"], content: "Three weeks of treating rest as something to earn. I keep working until I'm useless and calling it discipline. The dread before deep work lifts the second I start — the dread is about starting, not the work. I should stop fighting the start and start fighting the not-resting." },
  { s: null, daysAgo: 4, type: "observation", themes: ["attention", "rest"], content: "I think more clearly walking than sitting. The motion does something to the part of me that censors. My best ideas arrive the moment I stop trying to have them — never at the desk." },
  { s: null, daysAgo: 3, type: "feeling", themes: ["doubt", "late night"], content: "Late-night doubt again. Not about whether the idea is good — about whether I'm the person who gets to build it. By morning it's gone. The doubt has a curfew; it never survives sunrise, which makes me trust it less." },
  { s: null, daysAgo: 9, type: "feeling", themes: ["joy"], content: "A small unexpected good thing: the hawker auntie remembered my order without asking. Kaya toast, no sugar in the kopi. Stupid how much that fixed my whole morning." },
  { s: null, daysAgo: 17, type: "observation", themes: ["home", "rest"], content: "Singapore at 6am before the heat. Walked to nowhere for forty minutes. Nobody needs me before 9. That hour is the only thing I own outright." },
  { s: null, daysAgo: 19, type: "feeling", themes: ["burnout", "the product"], content: "Shipped the export feature at 3am and felt nothing. That's the tell. When finishing the thing produces no feeling, I've been running on the wrong fuel for too long." },

  // ---- a few more idea/work to hit the 60/40 and theme density ----
  { s: null, daysAgo: 25, type: "idea", themes: ["the product", "writing"], content: "The bank should read like a commonplace book, not a feed — reverent toward my own words. No counts, no streaks. A place that makes you want to be honest because nothing in it is keeping score." },
  { s: null, daysAgo: 20, type: "question", themes: ["the product", "anti-metric"], content: "How do I know it's working without metrics? The honest answer might be: I don't get to know cleanly, the way a funder wants to know. I get to know the slow, unscalable way — by reading what people actually wrote." },
  { s: "s7", daysAgo: 11, type: "question", themes: ["integrity", "the product"], content: "Could I fake even the good signal — 'resurfaced and acted on it'? Yes, if I tried. Nudge, notify, manufacture the resurfacing. The only thing protecting the product from rot is my own integrity, which is terrifying as a foundation." },
  { s: "s4", daysAgo: 19, type: "feeling", themes: ["ai & learning"], content: "Quiet alarm: a whole generation getting fluent at SOUNDING smart while getting worse at thinking. And no one will feel it happen, because sounding smart is exactly the thing that hides it." },
  { s: "s3", daysAgo: 23, type: "feeling", themes: ["science"], content: "Relief at finally getting a handle on the science thing — it's not that truth-seeking broke, it's that we built a career structure that pays for the appearance of discovery. Naming it stopped me sliding into being a crank." },
];

// ── daily summaries (kind=daily) — restrained Socratic voice, no praise ──────
const DAILY = [
  {
    daysAgo: 0,
    sessions: ["s11"],
    content: `A small thing landed: a paragraph on the bus stopped you for two stops. You traced it back — deep reading can't survive being made useful, and you'd been reading like clearing a backlog.

You made one decision out of it: protect some reading you're not allowed to use for anything. Useless on purpose.

Left open: whether you can actually hold that line, given that turning things into use is the habit of the whole month.`,
  },
  {
    daysAgo: 2,
    sessions: ["s10"],
    content: `You stopped diagnosing and tried to define: genuine learning is the felt click when your model changes, and the click only comes if you carried the confusion yourself.

From there a design rule fell out — an instrument, not an oracle; reveal the gap, don't close it. You noticed that's the thing being done to you in these calls.

One concrete change you named: make the memory surface a question, not a trophy. Still open: whether a tool can reliably make the gap without quietly stepping over it.`,
  },
  {
    daysAgo: 7,
    sessions: ["s9"],
    content: `You came in calling it a friendship drifting and left calling it a missing surface — you lost the empty afternoons, not each other.

That turned a thing to agonize over into a thing to test: a real call, on a walk, no agenda.

You didn't decide what it means yet. You decided to let the call decide.`,
  },
  {
    daysAgo: 9,
    sessions: ["s8"],
    content: `A product line you'd been circling got a rule: never count the days, only the thinking. You found the mechanism — a streak punishes the gap; a mirror is silent about absence.

You also turned the test on yourself and found the daily call might secretly count days. You said you'd audit it.

Open: what else in the build counts days without admitting it.`,
  },
  {
    daysAgo: 11,
    sessions: ["s7"],
    content: `The lens you've been pointing at your peers got turned around. The thing you fear in them — optimizing the legible fake over the real thing — is the thing you have the most power to do, if you chase the metrics that would fund you.

You found a signal you'd trust (a past you talking a present you into something) and then admitted you could fake even that.

What's left holding the thing honest is your own integrity. You called that terrifying as a foundation and didn't try to make it less so.`,
  },
  {
    daysAgo: 17,
    sessions: ["s5"],
    content: `You took a climate position past the slogan: abundance over degrowth, clean energy cheap enough that decarbonizing is the path of least resistance.

Under pressure you conceded the real edge — Jevons, mining, land use — and kept the view anyway, narrower: it solves carbon and trades it for smaller problems you'd rather have.

You ended with a stronger version than you started, because you let it cost you something.`,
  },
  {
    daysAgo: 19,
    sessions: ["s4"],
    content: `Last week it was "something is lost." This week it sharpened: the grade is the symptom, the disease is a game that rewards looking-like-you-learned, and AI is the solvent for a bond that was already only friction.

You caught the move, though — the bleak version might be momentum, not belief.

You left it where it can only be settled by watching what you do, not what you argue.`,
  },
];

// ── weekly recaps (kind=weekly) — longer "letters", hand meaning back ────────
const WEEKLY = [
  {
    // current week
    startDaysAgo: 6,
    endDaysAgo: 0,
    sessions: ["s9", "s10", "s11"],
    content: `This week the month-long thread about thinking and machines stopped being a complaint and became a definition. You said genuine learning is the felt click when your model changes — and the click only arrives if you carried the confusion yourself. From that, almost without trying, you derived the product you've been circling for a month: an instrument, not an oracle. Something that makes the gap visible and refuses to step over it for you. You even caught the design implication for memory — that a resurfaced thought should arrive as a question, not a trophy.

Underneath the work, a quieter week. A friendship you'd filed under "drifting" turned out to be a missing surface, not a missing person — you decided to test it with a call instead of mourning it in advance. And a paragraph on a bus stopped you cold and reminded you that the reading you keep grieving can't survive being made useful.

There's a thread connecting those last two to the work, if you want it: each is about protecting something from being instrumentalized — the friendship from logistics, the reading from use, the learning from the answer-machine. You haven't said out loud whether that's one principle or three coincidences. I'm not going to say it for you. But it's there.`,
  },
  {
    startDaysAgo: 13,
    endDaysAgo: 7,
    sessions: ["s7", "s8"],
    content: `This was the week the argument turned on you. For three weeks you'd been indicting a system that rewards the appearance of thinking over the real thing. This week you put yourself inside that frame and didn't flinch: the metric that would fund you — engagement — rewards exactly the betrayal of the thing you're building. A product built for its own obsolescence has a success signal invisible to the people who'd pay for it.

You found a signal you'd actually trust — a past version of you talking a present you into something — and then, to your credit, you refused to let yourself keep it for free: you admitted you could manufacture even that. Which left you somewhere uncomfortable and honest: the only thing protecting the product from rot is your own integrity.

Notice the symmetry, because you did: in week one you said that when the only thing holding people to real thinking is their own choosing, and not the structure, the whole thing rests on whether they keep choosing. You are now, by your own argument, that person — the one whose choosing is the only safeguard. You named it as the thing to never stop watching. That's not a tension to resolve. It's the one to keep.

Smaller but not small: you turned the anti-metric ethos into a rule you can actually hold — never count the days, only the thinking — and then immediately suspected your own daily call of breaking it. The instinct to audit your own product against your own ethics is the thing to keep doing.`,
  },
  {
    startDaysAgo: 27,
    endDaysAgo: 14,
    sessions: ["s1", "s2", "s3", "s4", "s5"],
    content: `The thread that opened this stretch came from a group chat: your peers — the sharp ones, not the lazy ones — handing a reflection essay to a machine, and your unease that there's no error message when someone stops thinking. By the end of the two weeks you'd moved that unease a long way. It went from "something is lost" to a sharper, colder claim: the grade is the symptom, not the disease; the disease is a game that rewards looking-like-you-learned; and AI is just the most efficient solvent for a bond to real thinking that was only ever made of friction.

You tested the same shape against other rooms and found it held. The replication crisis, you decided, isn't the method failing — it's the method catching a career structure that pays for the appearance of discovery. You even gave the recurring shape your own name rather than borrowing Goodhart's: every proxy gets gamed, and the gaming looks like success until you check the thing it stood in for.

You also did the harder thing of holding positions that could cost you something. On climate you pushed past the slogans to abundance-over-degrowth, then conceded the real edge — Jevons, mining — and kept a narrower, truer version. On your own direction you set a bar that isn't money or status: one real person whose thinking moved. And you admitted the bar might not always be the one you actually run on.

Two doubts you left honestly unresolved, which is the right place for them: whether the bleak "it was only ever friction" version is something you believe or something the argument's momentum carried you into — and whether your one-person bar is the real one or just the one that sounds noble at 2pm. You didn't close either. They're better open.`,
  },
];

// ── patterns (~5) — neutral observations / open questions, real provenance ───
// Provenance is filled in at insert time with REAL seeded ids (by entry index
// and session key), so it always references rows that exist.
const PATTERNS = [
  {
    kind: "recurring",
    surfacedDaysAgo: 1,
    // flagship thread across all four weeks
    entryIdx: [0, 3, 6, 8],
    sessionKeys: ["s1", "s4", "s10"],
    summary:
      "Across four weeks you keep returning to one shape: a system that rewards the appearance of a thing over the thing itself, and a worry that the appearance hides the loss. It started with a reflection essay, moved to grades-as-symptom, and last week became a positive definition — learning as the felt 'click' a machine can't hand you. You said it would settle by watching what you do, not what you argue. What do you make of having circled it this many times before naming what you're actually for?",
  },
  {
    kind: "contradiction",
    surfacedDaysAgo: 1,
    entryIdx: [12, 49],
    sessionKeys: ["s7"],
    summary:
      "Two things you've said sit in tension. You named the thing you most fear in other people — optimizing the legible fake over the real work — and then said you have more power to do exactly that than anyone, and could fake even the signal you'd trust. The critic and the suspect are the same person here. That's not a charge; it's a mirror. What do you make of it?",
  },
  {
    kind: "recurring",
    surfacedDaysAgo: 3,
    entryIdx: [29, 39, 45],
    sessionKeys: ["s11"],
    summary:
      "A quieter thread runs under the loud one: protecting things from being made useful. The friendship from logistics, the reading from extraction, the daily walk that nobody needs from you before nine. You haven't said whether this is one principle or three separate small mercies. The pattern is just here — the meaning is yours.",
  },
  {
    kind: "abandoned",
    surfacedDaysAgo: 4,
    entryIdx: [14],
    sessionKeys: [],
    summary:
      "You raised the question of whether the 'safer path' is actually safer or just more legible to other people — and then never came back to it. Every later session went toward building, not toward the fork. An open thread you set down. Worth picking up, or already answered by what you've been doing?",
  },
  {
    kind: "recurring",
    surfacedDaysAgo: 2,
    entryIdx: [18, 19, 48],
    sessionKeys: ["s8"],
    summary:
      "Anti-metric keeps coming back not as a slogan but as a working rule you re-derive each time: never count the days, only the thinking; does this surface make someone feel watched for absence. You keep auditing your own product against your own ethics. The recurrence is the signal — what's it telling you about where you don't yet trust yourself?",
  },
];

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  // 0) Confirm the auth user exists (we will NOT create/delete it).
  const users = await sql`select id from auth.users where id = ${USER_ID} limit 1`;
  if (!users.length) {
    console.error(
      `✗ No auth user with id ${USER_ID}. Create/sign-in that user first; this seed only fills their bank.`,
    );
    process.exit(1);
  }

  // 1) DELETE existing data for the user, FK-safe order. Wraps in a transaction.
  console.log("deleting existing data for user…");
  const del = await sql.begin(async (tx) => {
    const p = await tx`delete from patterns where user_id = ${USER_ID}`;
    const su = await tx`delete from summaries where user_id = ${USER_ID}`;
    const th = await tx`delete from themes where user_id = ${USER_ID}`;
    const e = await tx`delete from entries where user_id = ${USER_ID}`;
    // messages cascade on session delete, but delete explicitly first for a count
    const m = await tx`
      delete from messages
      where session_id in (select id from sessions where user_id = ${USER_ID})`;
    const s = await tx`delete from sessions where user_id = ${USER_ID}`;
    return {
      patterns: p.count,
      summaries: su.count,
      themes: th.count,
      entries: e.count,
      messages: m.count,
      sessions: s.count,
    };
  });
  console.log(
    `  deleted: ${del.patterns} patterns, ${del.summaries} summaries, ${del.themes} themes, ${del.entries} entries, ${del.messages} messages, ${del.sessions} sessions`,
  );

  // 2) UPSERT the profile — set the three demo fields, PRESERVE phone_e164.
  //    On insert (no row yet), phone is left NULL.
  const prof = await sql`
    insert into profiles (id, display_name, timezone, daily_call_time)
    values (${USER_ID}, 'Yancun', 'Asia/Singapore', '21:00')
    on conflict (id) do update set
      display_name = 'Yancun',
      timezone = 'Asia/Singapore',
      daily_call_time = '21:00'
    returning (xmax = 0) as inserted, phone_e164`;
  console.log(
    `  profile ${prof[0].inserted ? "inserted" : "updated"} (phone_e164 preserved: ${prof[0].phone_e164 ?? "NULL"})`,
  );

  // 3a) Insert sessions; remember their ids by key.
  console.log("inserting sessions…");
  const sessionId = {}; // key -> uuid
  let messageCount = 0;
  for (const S of SESSIONS) {
    // started_at = now() - daysAgo days, pinned to a local-ish hour-of-day.
    // We approximate the Asia/Singapore (UTC+8) rhythm by offsetting from the
    // start of the day in DB time; exact tz is unimportant for the demo, the
    // RELATIVE ordering + recency is what /today and the recaps key off.
    const interval = `${S.daysAgo} days`;
    const startExpr = sql`date_trunc('day', now()) - (${interval})::interval + (${S.hour} || ' hours')::interval`;
    const endMin = S.durMin;

    const transcript = S.type === "chat" ? null : JSON.stringify(S.turns);

    const [row] = await sql`
      insert into sessions (user_id, type, started_at, ended_at, transcript, elevenlabs_conversation_id)
      values (
        ${USER_ID},
        ${S.type},
        ${startExpr},
        ${startExpr} + (${endMin} || ' minutes')::interval,
        ${transcript}::jsonb,
        ${S.convId}
      )
      returning id`;
    sessionId[S.key] = row.id;

    // messages rows, timestamped progressively across the session window.
    const msgs = turnsToMessages(S.turns);
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      const offsetMin = Math.round((endMin * i) / Math.max(1, msgs.length - 1));
      await sql`
        insert into messages (session_id, role, content, created_at)
        values (
          ${row.id},
          ${m.role},
          ${m.content},
          ${startExpr} + (${offsetMin} || ' minutes')::interval
        )`;
      messageCount++;
    }
  }
  console.log(
    `  inserted ${Object.keys(sessionId).length} sessions, ${messageCount} messages`,
  );

  // 3b) Embed all entry contents in ONE batch, order-preserving.
  console.log(`embedding ${ENTRIES.length} entries…`);
  const emb = await openai.embeddings.create({
    model: EMB_MODEL,
    input: ENTRIES.map((e) => e.content.replace(/\n/g, " ").slice(0, 8000)),
  });
  const vectors = emb.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);

  // 3c) Insert entries (with their vectors), linked to a session where given.
  console.log("inserting entries…");
  for (let i = 0; i < ENTRIES.length; i++) {
    const e = ENTRIES[i];
    const vec = "[" + vectors[i].join(",") + "]";
    const sid = e.s ? sessionId[e.s] ?? null : null;
    const interval = `${e.daysAgo} days`;
    // dated within the day, late-evening-ish so /today picks up daysAgo=0 rows.
    await sql`
      insert into entries (user_id, session_id, type, content, embedding, themes, created_at)
      values (
        ${USER_ID},
        ${sid},
        ${e.type},
        ${e.content},
        ${vec}::vector,
        ${e.themes},
        date_trunc('day', now()) - (${interval})::interval + interval '20 hours'
      )`;
  }
  console.log(`  inserted ${ENTRIES.length} entries`);

  // 3d) Themes rollup from the entries — real counts, real first/last seen.
  console.log("rolling up themes…");
  // first_seen = the OLDEST entry = the LARGEST daysAgo;
  // last_seen  = the NEWEST entry = the SMALLEST daysAgo.
  const themeAgg = {}; // label -> { count, oldestDaysAgo, newestDaysAgo }
  for (const e of ENTRIES) {
    for (const label of e.themes) {
      const t = (themeAgg[label] ??= {
        count: 0,
        oldestDaysAgo: -Infinity, // grows toward the largest daysAgo
        newestDaysAgo: Infinity, // shrinks toward the smallest daysAgo
      });
      t.count += 1;
      if (e.daysAgo > t.oldestDaysAgo) t.oldestDaysAgo = e.daysAgo;
      if (e.daysAgo < t.newestDaysAgo) t.newestDaysAgo = e.daysAgo;
    }
  }
  // Optional short descriptions for the marquee threads (others left null).
  const THEME_DESC = {
    "ai & learning":
      "the month-long thread: offloaded thinking, the grade as symptom, and what the felt 'click' of real learning is",
    "the product": "design reasoning for Socrates — instrument not oracle, the midwife refusal",
    "anti-metric": "never count the days, only the thinking",
    incentives: "Goodhart, gamed proxies, paying for the appearance of a thing",
    direction: "post-ORD next steps and the bar that isn't money or status",
    ambition: "ambition pointed at a thing vs. at being seen as ambitious",
    attention: "the attention economy, walking to think, the cost of extracting from everything",
  };
  let themeCount = 0;
  for (const [label, t] of Object.entries(themeAgg)) {
    const firstInt = `${t.oldestDaysAgo} days`; // first_seen
    const lastInt = `${t.newestDaysAgo} days`; // last_seen
    await sql`
      insert into themes (user_id, label, description, entry_count, first_seen, last_seen)
      values (
        ${USER_ID},
        ${label},
        ${THEME_DESC[label] ?? null},
        ${t.count},
        date_trunc('day', now()) - (${firstInt})::interval + interval '20 hours',
        date_trunc('day', now()) - (${lastInt})::interval + interval '20 hours'
      )
      on conflict (user_id, label) do update set
        description = excluded.description,
        entry_count = excluded.entry_count,
        first_seen = excluded.first_seen,
        last_seen = excluded.last_seen`;
    themeCount++;
  }
  console.log(`  inserted/updated ${themeCount} themes`);

  // 3e) Daily summaries.
  console.log("inserting daily summaries…");
  for (const d of DAILY) {
    const sourceIds = d.sessions.map((k) => sessionId[k]).filter(Boolean);
    const dayInt = `${d.daysAgo} days`;
    await sql`
      insert into summaries (user_id, kind, period_start, period_end, content, source_session_ids, created_at)
      values (
        ${USER_ID},
        'daily',
        date_trunc('day', now()) - (${dayInt})::interval,
        date_trunc('day', now()) - (${dayInt})::interval + interval '23 hours 59 minutes',
        ${d.content},
        ${sourceIds},
        date_trunc('day', now()) - (${dayInt})::interval + interval '23 hours'
      )`;
  }
  console.log(`  inserted ${DAILY.length} daily summaries`);

  // 3f) Weekly recaps.
  console.log("inserting weekly recaps…");
  for (const w of WEEKLY) {
    const sourceIds = w.sessions.map((k) => sessionId[k]).filter(Boolean);
    const startInt = `${w.startDaysAgo} days`;
    const endInt = `${w.endDaysAgo} days`;
    await sql`
      insert into summaries (user_id, kind, period_start, period_end, content, source_session_ids, created_at)
      values (
        ${USER_ID},
        'weekly',
        date_trunc('day', now()) - (${startInt})::interval,
        date_trunc('day', now()) - (${endInt})::interval + interval '23 hours 59 minutes',
        ${w.content},
        ${sourceIds},
        date_trunc('day', now()) - (${endInt})::interval + interval '23 hours 30 minutes'
      )`;
  }
  console.log(`  inserted ${WEEKLY.length} weekly recaps`);

  // 3g) Patterns. We need the REAL entry ids to put in provenance, so re-read
  //     this user's entries in insert order (created_at desc, then content) and
  //     map our authoring indices to ids. Simpler + robust: re-query by content.
  console.log("inserting patterns…");
  // Build a content -> id map for the entries we just inserted.
  const entryRows = await sql`
    select id, content from entries where user_id = ${USER_ID}`;
  const idByContent = new Map(entryRows.map((r) => [r.content, r.id]));

  let patternCount = 0;
  for (const p of PATTERNS) {
    const entryIds = p.entryIdx
      .map((i) => idByContent.get(ENTRIES[i].content))
      .filter(Boolean);
    const sessionIds = p.sessionKeys.map((k) => sessionId[k]).filter(Boolean);
    const provenance = {};
    if (entryIds.length) provenance.entryIds = entryIds;
    if (sessionIds.length) provenance.sessionIds = sessionIds;
    const sInt = `${p.surfacedDaysAgo} days`;
    await sql`
      insert into patterns (user_id, kind, summary, provenance, surfaced_at)
      values (
        ${USER_ID},
        ${p.kind},
        ${p.summary},
        ${JSON.stringify(provenance)}::jsonb,
        date_trunc('day', now()) - (${sInt})::interval + interval '21 hours'
      )`;
    patternCount++;
  }
  console.log(`  inserted ${patternCount} patterns`);

  // ── final tally ────────────────────────────────────────────────────────────
  console.log("\n✓ Seed complete. Final counts for user", USER_ID + ":");
  const tally = await sql`
    select
      (select count(*) from sessions where user_id = ${USER_ID}) as sessions,
      (select count(*) from messages where session_id in (select id from sessions where user_id = ${USER_ID})) as messages,
      (select count(*) from entries where user_id = ${USER_ID}) as entries,
      (select count(*) from themes where user_id = ${USER_ID}) as themes,
      (select count(*) from summaries where user_id = ${USER_ID} and kind = 'daily') as daily,
      (select count(*) from summaries where user_id = ${USER_ID} and kind = 'weekly') as weekly,
      (select count(*) from patterns where user_id = ${USER_ID}) as patterns`;
  const t = tally[0];
  console.log(
    `  sessions=${t.sessions} messages=${t.messages} entries=${t.entries} themes=${t.themes} daily=${t.daily} weekly=${t.weekly} patterns=${t.patterns}`,
  );
}

main()
  .catch((e) => {
    console.error("\nseed-demo failed:", e.message);
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
