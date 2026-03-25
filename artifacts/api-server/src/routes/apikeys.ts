import { Router, type IRouter } from "express";
import { db, apiKeysTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

router.get("/v1/apikeys", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const user = (req as any).user;

  try {
    const keys = await db
      .select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.userId, user.id))
      .orderBy(apiKeysTable.createdAt);

    res.json({
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        requestCount: k.requestCount,
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to list API keys" });
  }
});

router.post("/v1/apikeys", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const user = (req as any).user;
  const { name } = req.body as { name: string };

  if (!name) {
    res.status(400).json({ error: "bad_request", message: "Name is required" });
    return;
  }

  try {
    const key = `aiw_${crypto.randomBytes(32).toString("hex")}`;
    const keyPrefix = key.substring(0, 12);
    const keyHash = hashKey(key);

    const [created] = await db
      .insert(apiKeysTable)
      .values({
        userId: user.id,
        name,
        keyHash,
        keyPrefix,
        requestCount: 0,
      })
      .returning();

    res.status(201).json({
      id: created.id,
      name: created.name,
      key,
      keyPrefix: created.keyPrefix,
      createdAt: created.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to create API key" });
  }
});

router.delete("/v1/apikeys/:id", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const user = (req as any).user;
  const id = Number(req.params.id);

  try {
    const [key] = await db
      .select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.id, id));

    if (!key || key.userId !== user.id) {
      res.status(404).json({ error: "not_found", message: "API key not found" });
      return;
    }

    await db.delete(apiKeysTable).where(eq(apiKeysTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to delete API key" });
  }
});

export default router;
