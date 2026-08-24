import { Router, type IRouter } from "express";
import { db, regulationItemsTable } from "@workspace/db";
import { desc, eq, and, or, ilike, sql, SQL } from "drizzle-orm";

const router: IRouter = Router();

router.get("/v1/regulations", async (req, res) => {
  try {
    const { regulationType, jurisdiction, urgency, vendor, keyword } = req.query as Record<string, string>;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    const conditions: SQL[] = [];

    if (regulationType) {
      const types = regulationType.split(",").map(t => t.trim()) as Array<
        "legislation" | "enforcement" | "guidance" | "court_ruling" | "standards" | "executive_action"
      >;
      conditions.push(
        types.length === 1
          ? eq(regulationItemsTable.regulationType, types[0])
          : or(...types.map(t => eq(regulationItemsTable.regulationType, t)))!
      );
    }

    if (jurisdiction) {
      const jurisdictions = jurisdiction.split(",").map(j => j.trim()) as Array<
        "eu" | "us_federal" | "us_state" | "uk" | "china" | "international"
      >;
      conditions.push(
        jurisdictions.length === 1
          ? eq(regulationItemsTable.jurisdiction, jurisdictions[0])
          : or(...jurisdictions.map(j => eq(regulationItemsTable.jurisdiction, j)))!
      );
    }

    if (urgency) {
      const statuses = urgency.split(",").map(u => u.trim()) as Array<
        "deadline_approaching" | "enforcement_live" | "proposed_draft" | "adopted_future"
      >;
      conditions.push(
        statuses.length === 1
          ? eq(regulationItemsTable.urgency, statuses[0])
          : or(...statuses.map(u => eq(regulationItemsTable.urgency, u)))!
      );
    }

    if (vendor) {
      // Same containment approach as /v1/news's mentionedVendors filter:
      // affectedVendors routinely has multiple entries, so array-equality
      // would never match in practice.
      conditions.push(
        sql`EXISTS (SELECT 1 FROM unnest(${regulationItemsTable.affectedVendors}) v WHERE v ILIKE ${vendor})`
      );
    }

    if (keyword) {
      const term = `%${keyword}%`;
      conditions.push(
        or(
          ilike(regulationItemsTable.title, term),
          ilike(regulationItemsTable.summary, term),
          ilike(regulationItemsTable.sourceName, term),
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db.select()
      .from(regulationItemsTable)
      .where(where)
      // Deadline-bearing items float to the top, soonest first; everything
      // else falls back to most-recently-detected, matching how the
      // compliance calendar strip on the frontend expects items ordered.
      .orderBy(
        sql`${regulationItemsTable.deadlineDate} IS NULL`,
        regulationItemsTable.deadlineDate,
        desc(regulationItemsTable.detectedAt),
      )
      .limit(limit)
      .offset(offset);

    res.json({ regulations: rows, total: rows.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to fetch regulations" });
  }
});

export default router;
