import { Router } from "express";
import { db, userLikesTable, updatesTable, vendorsTable, categoriesTable, newsItemsTable, newsSourcesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// GET /v1/likes — return liked IDs for the current user
router.get("/v1/likes", requireAuth, async (req: any, res) => {
  try {
    const rows = await db
      .select({ itemType: userLikesTable.itemType, itemId: userLikesTable.itemId })
      .from(userLikesTable)
      .where(eq(userLikesTable.userId, req.user.id));

    const updateIds = rows.filter(r => r.itemType === "update").map(r => r.itemId);
    const newsIds = rows.filter(r => r.itemType === "news").map(r => r.itemId);

    res.json({ updateIds, newsIds });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch likes" });
  }
});

// GET /v1/likes/items — return full liked items
router.get("/v1/likes/items", requireAuth, async (req: any, res) => {
  try {
    const rows = await db
      .select({ itemType: userLikesTable.itemType, itemId: userLikesTable.itemId, createdAt: userLikesTable.createdAt })
      .from(userLikesTable)
      .where(eq(userLikesTable.userId, req.user.id))
      .orderBy(userLikesTable.createdAt);

    const updateIds = rows.filter(r => r.itemType === "update").map(r => r.itemId);
    const newsIds = rows.filter(r => r.itemType === "news").map(r => r.itemId);

    const [updates, news] = await Promise.all([
      updateIds.length > 0
        ? db
            .select({
              update: updatesTable,
              vendor: vendorsTable,
              category: categoriesTable,
            })
            .from(updatesTable)
            .leftJoin(vendorsTable, eq(updatesTable.vendorId, vendorsTable.id))
            .leftJoin(categoriesTable, eq(updatesTable.categoryId, categoriesTable.id))
            .where(inArray(updatesTable.id, updateIds))
        : Promise.resolve([]),
      newsIds.length > 0
        ? db
            .select({
              item: newsItemsTable,
              source: newsSourcesTable,
            })
            .from(newsItemsTable)
            .leftJoin(newsSourcesTable, eq(newsItemsTable.sourceId, newsSourcesTable.id))
            .where(inArray(newsItemsTable.id, newsIds))
        : Promise.resolve([]),
    ]);

    const likedUpdates = updates.map(row => ({
      id: row.update.id,
      title: row.update.title,
      summary: row.update.summary,
      sourceUrl: row.update.sourceUrl,
      publishedAt: row.update.publishedAt?.toISOString() ?? null,
      detectedAt: row.update.detectedAt.toISOString(),
      highImpact: row.update.highImpact,
      whyItMatters: row.update.whyItMatters,
      confidenceScore: row.update.confidenceScore,
      flaggedForReview: row.update.flaggedForReview,
      vendor: row.vendor ? {
        id: row.vendor.id,
        name: row.vendor.name,
        slug: row.vendor.slug,
        logoUrl: row.vendor.logoUrl,
      } : null,
      category: row.category ? {
        id: row.category.id,
        name: row.category.name,
        slug: row.category.slug,
        color: row.category.color,
      } : null,
    }));

    const likedNews = news.map(row => ({
      id: row.item.id,
      title: row.item.title,
      summary: row.item.summary,
      sourceUrl: row.item.sourceUrl,
      publishedAt: row.item.publishedAt?.toISOString() ?? null,
      detectedAt: row.item.detectedAt.toISOString(),
      credibilityRating: row.item.credibilityRating,
      credibilityReason: row.item.credibilityReason,
      highInterest: row.item.highInterest,
      mentionedVendors: row.item.mentionedVendors,
      sourceName: row.source?.name ?? "Unknown",
      sourceType: row.source?.sourceType ?? "unknown",
    }));

    res.json({ updates: likedUpdates, news: likedNews });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch liked items" });
  }
});

const likeBodySchema = z.object({
  itemType: z.enum(["update", "news"]),
  itemId: z.number().int().positive(),
});

// POST /v1/likes — like an item
router.post("/v1/likes", requireAuth, async (req: any, res) => {
  const parsed = likeBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { itemType, itemId } = parsed.data;
  try {
    await db
      .insert(userLikesTable)
      .values({ userId: req.user.id, itemType, itemId })
      .onConflictDoNothing();
    res.json({ liked: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to like item" });
  }
});

// DELETE /v1/likes/:itemType/:itemId — unlike an item
router.delete("/v1/likes/:itemType/:itemId", requireAuth, async (req: any, res) => {
  const itemType = req.params.itemType as "update" | "news";
  const itemId = parseInt(req.params.itemId, 10);

  if (!["update", "news"].includes(itemType) || isNaN(itemId)) {
    return res.status(400).json({ error: "Invalid params" });
  }

  try {
    await db
      .delete(userLikesTable)
      .where(
        and(
          eq(userLikesTable.userId, req.user.id),
          eq(userLikesTable.itemType, itemType),
          eq(userLikesTable.itemId, itemId),
        )
      );
    res.json({ liked: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to unlike item" });
  }
});

export default router;
