// Runtime DB access — Drizzle over the Supabase transaction pooler (port 6543).
// The pooler does NOT support prepared statements, so we MUST set prepare:false
// or Vercel throws `prepared statement "s0" does not exist`. See SPEC §11.
//
// This connects as the postgres role (RLS-bypassing), so it is the trusted,
// server-only access path: the post-call pipeline writes through it, RAG reads
// through it, and server components scope every query by the authenticated
// user's id explicitly. RLS remains enabled as a DB-level backstop.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __socratesSql?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__socratesSql ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false, // required for pgbouncer transaction pooling
    max: 1, // serverless: keep the pool tiny
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__socratesSql = client;
}

export const db = drizzle(client, { schema });
export { schema };
