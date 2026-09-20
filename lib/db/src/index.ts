import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// DATABASE_URL points at the Supavisor pooler in SESSION mode (port 5432),
// which we need because withAdvisoryLock() relies on session-level
// pg_advisory_lock. Session mode caps the whole project at 15 client
// connections.
//
// node-postgres defaults max to 10 per Pool, and every warm Vercel serverless
// instance constructs its own Pool. Two or three warm instances exhausted the
// 15 and the pooler started rejecting with EMAXCONNSESSION, which surfaced as
// 500s on /api/v1/ingestion/trigger and /api/v1/news/trigger.
//
// The floor is 2, not 1: withAdvisoryLock() checks out one client and holds it
// for the entire run, while the ingestion inside it issues its own queries
// through this same pool. With max: 1 those inner queries would wait on a
// connection the lock holder never releases, and every run would deadlock
// until connectionTimeoutMillis fired.
//
// Long-lived callers that are not connection-constrained (the GitHub Actions
// ingestion job) can raise this via DATABASE_POOL_MAX.
const poolMax = Math.max(2, Number(process.env.DATABASE_POOL_MAX ?? 2));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: poolMax,
  // Hand connections back to the pooler quickly; a frozen serverless instance
  // otherwise keeps them checked out and invisible to every other instance.
  idleTimeoutMillis: 10_000,
  // Fail fast with a clear error instead of hanging forever when the pooler
  // really has nothing left to give.
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: true,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
