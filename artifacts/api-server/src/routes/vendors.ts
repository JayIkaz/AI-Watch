import { Router, type IRouter } from "express";
import { db, vendorsTable, updatesTable } from "@workspace/db";
import { eq, count, max, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/v1/vendors", async (req, res) => {
  try {
    const { tier, active } = req.query;

    let whereConditions = [];
    if (tier !== undefined) {
      whereConditions.push(eq(vendorsTable.tier, Number(tier)));
    }
    if (active !== undefined) {
      whereConditions.push(eq(vendorsTable.active, active === "true"));
    }

    const vendors = await db
      .select()
      .from(vendorsTable)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(vendorsTable.tier, vendorsTable.name);

    const vendorIds = vendors.map((v) => v.id);

    const updateCounts = await db
      .select({
        vendorId: updatesTable.vendorId,
        count: count(updatesTable.id),
        lastUpdateAt: max(updatesTable.publishedAt),
      })
      .from(updatesTable)
      .groupBy(updatesTable.vendorId);

    const countMap = new Map(
      updateCounts.map((c) => [c.vendorId, { count: c.count, lastUpdateAt: c.lastUpdateAt }])
    );

    const result = vendors.map((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.name,
      description: v.description,
      logoUrl: v.logoUrl,
      websiteUrl: v.websiteUrl,
      tier: v.tier,
      active: v.active,
      updateCount: countMap.get(v.id)?.count ?? 0,
      lastUpdateAt: countMap.get(v.id)?.lastUpdateAt ?? null,
    }));

    res.json({ vendors: result });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to list vendors" });
  }
});

router.get("/v1/vendors/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.slug, slug));

    if (!vendor) {
      res.status(404).json({ error: "not_found", message: "Vendor not found" });
      return;
    }

    const [updateStats] = await db
      .select({
        count: count(updatesTable.id),
        lastUpdateAt: max(updatesTable.publishedAt),
      })
      .from(updatesTable)
      .where(eq(updatesTable.vendorId, vendor.id));

    res.json({
      id: vendor.id,
      slug: vendor.slug,
      name: vendor.name,
      description: vendor.description,
      logoUrl: vendor.logoUrl,
      websiteUrl: vendor.websiteUrl,
      tier: vendor.tier,
      active: vendor.active,
      updateCount: updateStats?.count ?? 0,
      lastUpdateAt: updateStats?.lastUpdateAt ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to get vendor" });
  }
});

export default router;
