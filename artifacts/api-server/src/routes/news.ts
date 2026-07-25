import { Router, type IRouter } from "express";
import { db, newsItemsTable } from "@workspace/db";
import { desc, eq, and, or, ilike, count, sql, SQL } from "drizzle-orm";
import { runNewsIngestion, withAdvisoryLock, isLockHeld, NEWS_INGESTION_LOCK_KEY } from "@workspace/ingestion";
import { requireAdmin } from "../middlewares/requireAdmin";
import { adminTriggerRateLimit } from "../middlewares/rateLimit";

const router: IRouter = Router();

router.get("/v1/news", async (req, res) => {
  try {
    const { credibility, vendor, highInterest, keyword } = req.query as Record<string, string>;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    const conditions: SQL[] = [];

    if (credibility) {
      const ratings = credibility.split(",").map(r => r.trim()) as Array<"verified" | "likely" | "unverified" | "gossip">;
      if (ratings.length === 1) {
        conditions.push(eq(newsItemsTable.credibilityRating, ratings[0]));
      } else if (ratings.length > 1) {
        conditions.push(or(...ratings.map(r => eq(newsItemsTable.credibilityRating, r)))!);
      }
    }

    if (vendor) {
      // Case-insensitive containment: does any element of mentionedVendors
      // match the requested vendor? (mentionedVendors routinely has multiple
      // entries, so array-equality here would never match in practice.)
      conditions.push(
        sql`EXISTS (SELECT 1 FROM unnest(${newsItemsTable.mentionedVendors}) v WHERE v ILIKE ${vendor})`
      );
    }

    if (highInterest !== undefined) {
      conditions.push(eq(newsItemsTable.highInterest, highInterest === "true"));
    }

    if (keyword) {
      const term = `%${keyword}%`;
      conditions.push(
        or(
          ilike(newsItemsTable.title, term),
          ilike(newsItemsTable.summary, term),
          ilike(newsItemsTable.sourceName, term),
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db.select()
      .from(newsItemsTable)
      .where(where)
      .orderBy(desc(newsItemsTable.detectedAt))
      .limit(limit)
      .offset(offset);

    res.json({ news: rows, total: rows.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to fetch news" });
  }
});

router.post("/v1/news/trigger", requireAdmin, adminTriggerRateLimit, async (req, res) => {
  // Awaited, not fire-and-forget — see routes/ingestion.ts for why.
  const outcome = await withAdvisoryLock(NEWS_INGESTION_LOCK_KEY, () => runNewsIngestion());

  if (outcome.skipped) {
    res.json({ started: false, message: "News ingestion already running" });
    return;
  }

  res.json({ started: true, message: "News ingestion complete", result: outcome.result });
});

router.get("/v1/news/status", async (req, res) => {
  try {
    const [lastItem] = await db.select({ detectedAt: newsItemsTable.detectedAt })
      .from(newsItemsTable)
      .orderBy(desc(newsItemsTable.detectedAt))
      .limit(1);

    const [{ total }] = await db.select({ total: count() }).from(newsItemsTable);

    res.json({
      isRunning: await isLockHeld(NEWS_INGESTION_LOCK_KEY),
      lastRunAt: lastItem?.detectedAt ?? null,
      totalItems: total,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to get news status" });
  }
});

export default router;
