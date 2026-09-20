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

// Non-blocking check of whether a lock is currently held by any session,
// without running anything. Used by status endpoints to report "is ingestion
// running" accurately across processes/hosts (GitHub Actions, a manual
// trigger, etc.) instead of a per-process in-memory flag.
//
// This reads pg_locks rather than acquiring and immediately releasing the
// lock. The old approach checked out a dedicated client from the pool on every
// call, and the frontend polls the two status endpoints every 10 seconds from
// four components, so it was the single largest consumer of a connection
// budget that tops out at 15 for the whole project. pool.query() checks a
// client out and returns it as soon as the query resolves.
//
// pg_advisory_lock(bigint) records the key as classid = high 32 bits,
// objid = low 32 bits, objsubid = 1. Both lock keys here fit in 32 bits, so
// classid is always 0. (objsubid 2 would mean the two-int overload.)
export async function isLockHeld(lockKey: number): Promise<boolean> {
  const { rows } = await pool.query<{ held: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM pg_locks
       WHERE locktype = 'advisory'
         AND classid = 0
         AND objid::bigint = $1::bigint
         AND objsubid = 1
         AND granted
     ) AS held`,
    [lockKey],
  );
  return rows[0]?.held ?? false;
}
