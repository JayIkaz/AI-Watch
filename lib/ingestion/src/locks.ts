import { pool } from "@workspace/db";

// Fixed, arbitrary advisory-lock keys. Vendor and news ingestion can still run
// concurrently with each other (matching the old two-independent-flags
// behavior), just not with themselves.
export const VENDOR_INGESTION_LOCK_KEY = 727100001;
export const NEWS_INGESTION_LOCK_KEY = 727100002;

export type LockOutcome<T> = { skipped: false; result: T } | { skipped: true };

// Session-level Postgres advisory lock. Must acquire/release on the same
// connection, so a single client is checked out of the pool and held for the
// duration of fn() rather than routed through the shared pool query helper.
export async function withAdvisoryLock<T>(lockKey: number, fn: () => Promise<T>): Promise<LockOutcome<T>> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock($1) AS locked", [lockKey]);
    if (!rows[0]?.locked) {
      return { skipped: true };
    }

    try {
      const result = await fn();
      return { skipped: false, result };
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [lockKey]);
    }
  } finally {
    client.release();
  }
}

// Non-blocking check of whether a lock is currently held by another
// session, without running anything. Used by status endpoints to report
// "is ingestion running" accurately across processes/hosts (GitHub Actions,
// a manual trigger, etc.) instead of a per-process in-memory flag.
export async function isLockHeld(lockKey: number): Promise<boolean> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock($1) AS locked", [lockKey]);
    if (!rows[0]?.locked) {
      return true;
    }
    await client.query("SELECT pg_advisory_unlock($1)", [lockKey]);
    return false;
  } finally {
    client.release();
  }
}
