// Provision the dedicated DEMO Supabase auth user — the account "See demo" reads
// from, kept SEPARATE from the owner's real account so a curated demo persona can
// be seeded and re-seeded without ever touching the owner's bank.
//
// This creates ONLY the auth user. It does NOT seed or delete anything — run
// `npm run reseed` afterwards to fill the demo bank. Idempotent: if the demo
// email already exists, it prints the existing id and exits 0.
//
// Usage:
//   node scripts/provision-demo.mjs
//
// Requires .env.local with:
//   NEXT_PUBLIC_SUPABASE_URL   (the project url)
//   SUPABASE_SECRET_KEY        (the service `sb_secret_...` key — bypasses RLS)

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

process.loadEnvFile?.(".env.local");

// ── the dedicated demo account ──────────────────────────────────────────────
const DEMO_EMAIL = "demo.pitch@socrates-ai.app";

// ── env guards ──────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL) {
  console.error(
    "✗ NEXT_PUBLIC_SUPABASE_URL is required (set it in .env.local). Aborting.",
  );
  process.exit(1);
}
if (!SECRET_KEY) {
  console.error(
    "✗ SUPABASE_SECRET_KEY is required (set it in .env.local). Aborting.",
  );
  process.exit(1);
}
if (!SECRET_KEY.startsWith("sb_secret_")) {
  console.error(
    "✗ SUPABASE_SECRET_KEY must be a service `sb_secret_...` key (got a non-secret value). " +
      "A publishable value can't create auth users. Aborting.",
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── find an existing user with the demo email (idempotent) ──────────────────
async function findExistingId() {
  let page = 1;
  // page through all users; perPage 1000 keeps the round-trips low.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) {
      throw new Error(`listUsers failed: ${error.message}`);
    }
    const users = data?.users ?? [];
    const match = users.find(
      (u) => u.email?.toLowerCase() === DEMO_EMAIL.toLowerCase(),
    );
    if (match) return match.id;
    // last page when fewer than a full page came back
    if (users.length < 1000) return null;
    page += 1;
  }
}

async function main() {
  const existingId = await findExistingId();
  if (existingId) {
    console.log(`Demo user already exists for ${DEMO_EMAIL}.`);
    console.log("\nDEMO_USER_ID=" + existingId);
    console.log(
      "Next: set this as DEMO_USER_ID in .env.local and as the default in lib/demo.ts, then run `npm run reseed`.",
    );
    return;
  }

  // A long random password — the demo account is never signed into directly
  // (visitors get a read-only cookie session, not these credentials).
  const password = randomBytes(48).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password,
    email_confirm: true,
  });
  if (error) {
    throw new Error(`createUser failed: ${error.message}`);
  }
  const id = data?.user?.id;
  if (!id) {
    throw new Error("createUser returned no user id");
  }

  console.log(`Created demo user ${DEMO_EMAIL}.`);
  console.log("\nDEMO_USER_ID=" + id);
  console.log(
    "Next: set this as DEMO_USER_ID in .env.local and as the default in lib/demo.ts, then run `npm run reseed`.",
  );
}

main().catch((e) => {
  console.error("\nprovision-demo failed:", e.message);
  process.exit(1);
});
