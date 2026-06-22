// Seed a user's bank with a handful of real, embedded entries so the
// constellation and the bank look alive in the demo. Idempotent-ish: it tags a
// seed session so you can tell seeded rows apart.
//
// Usage:  node scripts/seed.mjs you@example.com
//   (the user must already exist — sign in once via magic link first)

import postgres from "postgres";
import OpenAI from "openai";

process.loadEnvFile?.(".env.local");

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/seed.mjs <user-email>");
  process.exit(1);
}

function sessionUrl() {
  if (process.env.MIGRATE_URL) return process.env.MIGRATE_URL;
  const u = new URL(process.env.DATABASE_URL);
  u.port = "5432";
  u.search = "";
  return u.toString();
}

const sql = postgres(sessionUrl(), { prepare: false, max: 1 });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMB_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

const ENTRIES = [
  { type: "idea", content: "What if the daily call opened on a live thread from yesterday instead of asking how my day was? The 'how was your day' is dead on arrival.", themes: ["the product", "attention"] },
  { type: "question", content: "Why do I keep returning to the same decision about the framework without ever actually closing it?", themes: ["indecision", "metacognition"] },
  { type: "feeling", content: "A quiet dread before deep work that lifts the second I actually start. The dread is about starting, not the work.", themes: ["attention", "work"] },
  { type: "observation", content: "I think more clearly walking than sitting. The motion does something to the part of me that censors.", themes: ["attention"] },
  { type: "decision", content: "Ship the on-demand voice before the scheduled call. It's the reliable spine; the phone call is the magic but the spine has to hold.", themes: ["the product", "work"] },
  { type: "opinion", content: "Most productivity advice is an elaborate way of avoiding the one hard thing you already know you're avoiding.", themes: ["work", "indecision"] },
  { type: "idea", content: "The bank should read like a commonplace book, not a feed. Reverent toward my own words. No counts, no streaks.", themes: ["the product"] },
  { type: "feeling", content: "Relief, finally naming a thing I'd been circling for weeks without a handle.", themes: ["metacognition"] },
  { type: "question", content: "Is solitude the input to good thinking, or the output of it? I can't tell which way the arrow points.", themes: ["attention", "metacognition"] },
  { type: "observation", content: "My best ideas arrive the moment I stop trying to have them — in the shower, on the walk, never at the desk.", themes: ["attention"] },
  { type: "idea", content: "Surface the contradiction gently and let me supply the meaning. The instant a tool tells me what my pattern means, I stop trusting it.", themes: ["the product", "metacognition"] },
  { type: "decision", content: "Stop re-deciding the architecture every week. Commit for a month, then review once. The re-deciding is the real cost.", themes: ["indecision", "work"] },
];

const DAILY = `You came in buzzing about the product and left having made one real cut: ship the on-demand voice first, let the phone call be the magic on top.

A thread surfaced again — re-deciding the framework. You named the cost this time: it's the re-deciding itself, not the choice.

One question you left open: whether solitude is the input to clear thinking or its output. You didn't answer it. You didn't need to.`;

async function main() {
  const users = await sql`select id from auth.users where email = ${email} limit 1`;
  if (!users.length) {
    console.error(`No user with email ${email}. Sign in once, then re-run.`);
    process.exit(1);
  }
  const userId = users[0].id;
  console.log("user:", userId);

  // a provenance session
  const [session] = await sql`
    insert into sessions (user_id, type, started_at, ended_at, elevenlabs_conversation_id)
    values (${userId}, 'on_demand_voice', now() - interval '1 day', now() - interval '1 day' + interval '11 minutes', ${"seed-" + Date.now()})
    returning id`;
  console.log("session:", session.id);

  console.log("embedding entries…");
  const emb = await openai.embeddings.create({
    model: EMB_MODEL,
    input: ENTRIES.map((e) => e.content),
  });
  const vectors = emb.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);

  for (let i = 0; i < ENTRIES.length; i++) {
    const e = ENTRIES[i];
    const vec = "[" + vectors[i].join(",") + "]";
    const daysAgo = Math.floor(i / 3); // spread across a few days
    await sql`
      insert into entries (user_id, session_id, type, content, embedding, themes, created_at)
      values (${userId}, ${session.id}, ${e.type}, ${e.content}, ${vec}::vector, ${e.themes}, now() - (${daysAgo} || ' days')::interval)`;
  }
  console.log(`inserted ${ENTRIES.length} entries`);

  // themes rollup
  const counts = {};
  for (const e of ENTRIES) for (const t of e.themes) counts[t] = (counts[t] || 0) + 1;
  for (const [label, count] of Object.entries(counts)) {
    await sql`
      insert into themes (user_id, label, entry_count, first_seen, last_seen)
      values (${userId}, ${label}, ${count}, now() - interval '3 days', now())`;
  }
  console.log(`inserted ${Object.keys(counts).length} themes`);

  // a daily summary
  await sql`
    insert into summaries (user_id, kind, period_start, period_end, content, source_session_ids)
    values (${userId}, 'daily', date_trunc('day', now()), now(), ${DAILY}, ${[session.id]})`;
  console.log("inserted daily summary");

  console.log("\nSeed complete.");
}

main()
  .catch((e) => {
    console.error("seed failed:", e.message);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
