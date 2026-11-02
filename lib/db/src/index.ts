import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Two connection strings, because the app needs two kinds of connection.
//
// DATABASE_URL is the Supavisor pooler in SESSION mode (port 5432). It is
// required by withAdvisoryLock(), which relies on a session-level
// pg_advisory_lock held on one connection for the whole run. Session mode caps
// the entire Supabase project at a fixed number of client connections (30 at
// the last incident). Every warm Vercel serverless instance builds its own
// Pool, so a burst of parallel requests starts many instances and exhausts
// that cap. The pooler then rejects with EMAXCONNSESSION and the API returns
// 500s.
//
// DATABASE_POOL_URL is optional. Set it to the same pooler in TRANSACTION mode
// (port 6543). Transaction-mode connections are shared between clients, so
// ordinary reads and writes stop counting against the session cap. When it is
// unset, everything uses DATABASE_URL exactly as before.
//
// Nothing in the code base needs session state other than the advisory lock:
// there are no transactions held across calls, no LISTEN, no temp tables and
// no named prepared statements.
//
// The floor is 2, not 1, when the shared pool also serves the lock:
// withAdvisoryLock() checks out one client and holds it for the entire run,
// while the ingestion inside it issues its own queries through the same pool.
// With max: 1 those inner queries would wait on a connection the lock holder
// never releases, and every run would deadlock until connectionTimeoutMillis
// fired. The dedicated lock pool uses the same floor for the same reason.
//
// Long-lived callers that are not connection-constrained (the GitHub Actions
// ingestion job) can raise the main pool size via DATABASE_POOL_MAX.
const sessionUrl = process.env.DATABASE_URL;
const poolUrl = process.env.DATABASE_POOL_URL || sessionUrl;
const poolMax = Math.max(2, Number(process.env.DATABASE_POOL_MAX ?? 2));

const sharedOptions = {
  // Hand connections back to the pooler quickly; a frozen serverless instance
  // otherwise keeps them checked out and invisible to every other instance.
  idleTimeoutMillis: 10_000,
  // Fail fast with a clear error instead of hanging forever when the pooler
  // really has nothing left to give.
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: true,
};

export const pool = new Pool({
  connectionString: poolUrl,
  max: poolMax,
  ...sharedOptions,
});

let lockPool: pg.Pool | undefined;

// Pool used only for session-level advisory locks. It must talk to the
// session-mode URL. When no separate transaction-mode URL is configured the
// main pool already is session mode, so it is returned as is and no extra
// connections are ever opened.
export function getLockPool(): pg.Pool {
  if (poolUrl === sessionUrl) return pool;
  lockPool ??= new Pool({
    connectionString: sessionUrl,
    // One client is held for the whole run. The second lets a concurrent
    // trigger request on the same instance run pg_try_advisory_lock, find the
    // lock taken and return "skipped" straight away, instead of queueing for a
    // connection until connectionTimeoutMillis and failing with a 500.
    max: 2,
    ...sharedOptions,
  });
  return lockPool;
}

export const db = drizzle(pool, { schema });

export * from "./schema";
