import { Router, type IRouter } from "express";
import { db, categoriesTable, updatesTable } from "@workspace/db";
import { count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/v1/categories", async (_req, res) => {
  try {
    const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.name);

    const counts = await db
      .select({
        categoryId: updatesTable.categoryId,
        count: count(updatesTable.id),
      })
      .from(updatesTable)
      .groupBy(updatesTable.categoryId);

    const countMap = new Map(counts.map((c) => [c.categoryId, c.count]));

    const result = categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      color: c.color,
      updateCount: countMap.get(c.id) ?? 0,
    }));

    res.json({ categories: result });
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: "Failed to list categories" });
  }
});

export default router;
