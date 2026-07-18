import { Router, type IRouter } from "express";
import { db, updatesTable, vendorsTable, categoriesTable } from "@workspace/db";
import {
  eq, and, gte, lte, ilike, or, desc, count, SQL
} from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

router.get("/v1/updates", async (req, res) => {
  try {
    const {
      vendor,
      category,
      keyword,
      date_from,
      date_to,
      flagged,
      highImpact,
    } = req.query as Record<string, string>;

    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    const conditions: SQL[] = [];

    if (vendor) {
      const slugs = vendor.split(",").map((s) => s.trim());
      const vendorRows = await db
        .select({ id: vendorsTable.id })
        .from(vendorsTable)
        .where(
          slugs.length === 1
            ? eq(vendorsTable.slug, slugs[0])
            : or(...slugs.map((s) => eq(vendorsTable.slug, s)))!
        );
      const ids = vendorRows.map((r) => r.id);
      if (ids.length > 0) {
        conditions.push(or(...ids.map((id) => eq(updatesTable.vendorId, id)))!);
      }
    }

    if (category) {
      const slugs = category.split(",").map((s) => s.trim());
      const catRows = await db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(
          slugs.length === 1
            ? eq(categoriesTable.slug, slugs[0])
            : or(...slugs.map((s) => eq(categoriesTable.slug, s)))!
        );
      const ids = catRows.map((r) => r.id);
      if (ids.length > 0) {
        conditions.push(or(...ids.map((id) => eq(updatesTable.categoryId, id)))!);
      }
    }

    if (keyword) {
      conditions.push(
        or(
          ilike(updatesTable.title, `%${keyword}%`),
          ilike(updatesTable.summary, `%${keyword}%`)
        )!
      );
    }

    if (date_from) {
      conditions.push(gte(updatesTable.publishedAt, new Date(date_from)));
    }

    if (date_to) {
      conditions.push(lte(updatesTable.publishedAt, new Date(date_to)));
    }

    if (flagged !== undefined) {
      conditions.push(eq(updatesTable.flaggedForReview, flagged === "true"));
    }

    if (highImpact !== undefined) {
      conditions.push(eq(updatesTable.highImpact, highImpact === "true"));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, rows] = await Promise.all([
      db.select({ count: count() }).from(updatesTable).where(where),
      db
        .select({
          update: updatesTable,
          vendor: {
            id: vendorsTable.id,
            slug: vendorsTable.slug,
            name: vendorsTable.name,
            logoUrl: vendorsTable.logoUrl,
          },
          category: {
            id: categoriesTable.id,
            slug: categoriesTable.slug,
            name: categoriesTable.name,
            color: categoriesTable.color,
          },
        })
        .from(updatesTable)
        .leftJoin(vendorsTable, eq(updatesTable.vendorId, vendorsTable.id))
        .leftJoin(categoriesTable, eq(updatesTable.categoryId, categoriesTable.id))
        .where(where)
        .orderBy(desc(updatesTable.publishedAt), desc(updatesTable.detectedAt))
        .limit(limit)
        .offset(offset),
    ]);

    const updates = rows.map((r) => ({
      id: r.update.id,
      title: r.update.title,
      summary: r.update.summary,
      rawContent: r.update.rawContent,
      sourceUrl: r.update.sourceUrl,
      publishedAt: r.update.publishedAt,
      detectedAt: r.update.detectedAt,
      confidenceScore: r.update.confidenceScore,
      flaggedForReview: r.update.flaggedForReview,
      highImpact: r.update.highImpact,
      whyItMatters: r.update.whyItMatters,
      vendor: r.vendor!,
      category: r.category!,
    }));

    res.json({
      updates,
      total: totalResult[0]?.count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to list updates" });
  }
});

router.get("/v1/updates/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [row] = await db
      .select({
        update: updatesTable,
        vendor: {
          id: vendorsTable.id,
          slug: vendorsTable.slug,
          name: vendorsTable.name,
          logoUrl: vendorsTable.logoUrl,
        },
        category: {
          id: categoriesTable.id,
          slug: categoriesTable.slug,
          name: categoriesTable.name,
          color: categoriesTable.color,
        },
      })
      .from(updatesTable)
      .leftJoin(vendorsTable, eq(updatesTable.vendorId, vendorsTable.id))
      .leftJoin(categoriesTable, eq(updatesTable.categoryId, categoriesTable.id))
      .where(eq(updatesTable.id, id));

    if (!row) {
      res.status(404).json({ error: "not_found", message: "Update not found" });
      return;
    }

    res.json({
      id: row.update.id,
      title: row.update.title,
      summary: row.update.summary,
      rawContent: row.update.rawContent,
      sourceUrl: row.update.sourceUrl,
      publishedAt: row.update.publishedAt,
      detectedAt: row.update.detectedAt,
      confidenceScore: row.update.confidenceScore,
      flaggedForReview: row.update.flaggedForReview,
      highImpact: row.update.highImpact,
      whyItMatters: row.update.whyItMatters,
      vendor: row.vendor!,
      category: row.category!,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to get update" });
  }
});

router.patch("/v1/updates/:id/flag", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { flagged } = req.body as { flagged: boolean };

    await db
      .update(updatesTable)
      .set({ flaggedForReview: flagged })
      .where(eq(updatesTable.id, id));

    const [row] = await db
      .select({
        update: updatesTable,
        vendor: {
          id: vendorsTable.id,
          slug: vendorsTable.slug,
          name: vendorsTable.name,
          logoUrl: vendorsTable.logoUrl,
        },
        category: {
          id: categoriesTable.id,
          slug: categoriesTable.slug,
          name: categoriesTable.name,
          color: categoriesTable.color,
        },
      })
      .from(updatesTable)
      .leftJoin(vendorsTable, eq(updatesTable.vendorId, vendorsTable.id))
      .leftJoin(categoriesTable, eq(updatesTable.categoryId, categoriesTable.id))
      .where(eq(updatesTable.id, id));

    if (!row) {
      res.status(404).json({ error: "not_found", message: "Update not found" });
      return;
    }

    res.json({
      id: row.update.id,
      title: row.update.title,
      summary: row.update.summary,
      rawContent: row.update.rawContent,
      sourceUrl: row.update.sourceUrl,
      publishedAt: row.update.publishedAt,
      detectedAt: row.update.detectedAt,
      confidenceScore: row.update.confidenceScore,
      flaggedForReview: row.update.flaggedForReview,
      highImpact: row.update.highImpact,
      whyItMatters: row.update.whyItMatters,
      vendor: row.vendor!,
      category: row.category!,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to flag update" });
  }
});

export default router;
