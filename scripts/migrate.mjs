// Migration runner that works around Supabase's IPv6-only direct host
// (db.<ref>.supabase.co:5432), which isn't routable on many networks. We apply
// migrations over the SESSION-mode pooler (the pooler host on port 5432, which
// supports DDL + multi-statement transactions), tracking applied files in a
// simple _migrations table. Idempotent: re-running only applies new files.
//
// Usage: node scripts/migrate.mjs   (reads .env.local)

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

process.loadEnvFile?.(".env.local");

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const migrationsDir = join(root, "drizzle");

// Prefer an explicit session URL; otherwise derive one from the pooler URL.
function sessionUrl() {
  if (process.env.MIGRATE_URL) return process.env.MIGRATE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL is required");
  const u = new URL(base);
  u.port = "5432"; // session mode (transaction mode is 6543)
  u.search = ""; // drop ?pgbouncer=true
  return u.toString();
}

const sql = postgres(sessionUrl(), { prepare: false, max: 1, idle_timeout: 10 });

async function main() {
  await sql`CREATE TABLE IF NOT EXISTS public._migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`;

  const applied = new Set(
    (await sql`SELECT name FROM public._migrations`).map((r) => r.name),
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`· skip   ${file}`);
      continue;
    }
    const raw = readFileSync(join(migrationsDir, file), "utf8");
    const statements = raw
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s && !s.replace(/--.*$/gm, "").trim().match(/^$/));

    process.stdout.write(`→ apply  ${file} (${statements.length} stmts) ... `);
    await sql.begin(async (tx) => {
      for (const stmt of statements) {
        await tx.unsafe(stmt);
      }
      await tx`INSERT INTO public._migrations (name) VALUES (${file})`;
    });
    console.log("done");
    count++;
  }

  console.log(count ? `\nApplied ${count} migration(s).` : "\nUp to date.");
}

main()
  .catch((e) => {
    console.error("\nMigration failed:", e.message);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
