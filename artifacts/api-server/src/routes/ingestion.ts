import { Router, type IRouter } from "express";
import { db, ingestionRunsTable, ingestionSourcesTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { runFullIngestion, withAdvisoryLock, isLockHeld, VENDOR_INGESTION_LOCK_KEY } from "@workspace/ingestion";
import { requireAdmin } from "../middlewares/requireAdmin";
import { adminTriggerRateLimit } from "../middlewares/rateLimit";

const router: IRouter = Router();

router.post("/v1/ingestion/trigger", requireAdmin, adminTriggerRateLimit, async (req, res) => {
  const { vendorSlugs } = (req.body ?? {}) as { vendorSlugs?: string[] };

  if (await isLockHeld(VENDOR_INGESTION_LOCK_KEY)) {
    res.json({ started: false, message: "Ingestion already running" });
    return;
  }

  // Run in background; the advisory lock (acquired inside withAdvisoryLock)
  // is what actually prevents overlap, not this response.
  setImmediate(() => {
    withAdvisoryLock(VENDOR_INGESTION_LOCK_KEY, () => runFullIngestion(vendorSlugs)).catch((err) => {
      req.log.error(err, "Manual vendor ingestion trigger failed");
    });
  });

  res.json({ started: true, message: "Ingestion started" });
});

router.get("/v1/ingestion/status", async (req, res) => {
  try {
    const [lastRun] = await db
      .select()
      .from(ingestionRunsTable)
      .orderBy(desc(ingestionRunsTable.startedAt))
      .limit(1);

    const [queuedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ingestionSourcesTable)
      .where(eq(ingestionSourcesTable.active, true));

    res.json({
      isRunning: await isLockHeld(VENDOR_INGESTION_LOCK_KEY),
      lastRunAt: lastRun?.startedAt ?? null,
      lastRunItemsProcessed: lastRun?.itemsProcessed ?? 0,
      lastRunErrors: lastRun?.errors ?? 0,
      queuedVendors: queuedCount?.count ?? 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to get status" });
  }
});

export default router;
