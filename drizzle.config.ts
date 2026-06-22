import type { Config } from "drizzle-kit";

// Load .env.local for CLI runs (Node 20.12+/26). Migrations use DIRECT_URL (5432).
process.loadEnvFile?.(".env.local");

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
