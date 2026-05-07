import { Router, type IRouter } from "express";
import { db, userPreferencesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/auth/me", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.json(null);
    return;
  }

  const user = (req as any).user;
  res.json({
    id: user.id,
    username: user.username ?? null,
    displayName: user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`.trim()
      : user.firstName ?? user.username ?? null,
    profileImageUrl: user.profileImageUrl ?? null,
    createdAt: user.createdAt,
  });
});

router.get("/v1/users/preferences", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const user = (req as any).user;

  try {
    const [prefs] = await db
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.userId, user.id));

    if (!prefs) {
      // Return defaults
      res.json({
        vendorSlugs: [],
        categorySlugs: [],
        digestFrequency: "none",
        alertKeywords: [],
        emailAlerts: false,
      });
      return;
    }

    res.json({
      vendorSlugs: prefs.vendorSlugs ?? [],
      categorySlugs: prefs.categorySlugs ?? [],
      digestFrequency: prefs.digestFrequency,
      alertKeywords: prefs.alertKeywords ?? [],
      emailAlerts: prefs.emailAlerts,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to get preferences" });
  }
});

router.put("/v1/users/preferences", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const user = (req as any).user;
  const { vendorSlugs, categorySlugs, digestFrequency, alertKeywords, emailAlerts } = req.body;

  try {
    const existing = await db
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.userId, user.id));

    if (existing.length === 0) {
      await db.insert(userPreferencesTable).values({
        userId: user.id,
        vendorSlugs: vendorSlugs ?? [],
        categorySlugs: categorySlugs ?? [],
        digestFrequency: digestFrequency ?? "none",
        alertKeywords: alertKeywords ?? [],
        emailAlerts: emailAlerts ?? false,
        updatedAt: new Date(),
      });
    } else {
      await db
        .update(userPreferencesTable)
        .set({
          ...(vendorSlugs !== undefined && { vendorSlugs }),
          ...(categorySlugs !== undefined && { categorySlugs }),
          ...(digestFrequency !== undefined && { digestFrequency }),
          ...(alertKeywords !== undefined && { alertKeywords }),
          ...(emailAlerts !== undefined && { emailAlerts }),
          updatedAt: new Date(),
        })
        .where(eq(userPreferencesTable.userId, user.id));
    }

    const [updated] = await db
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.userId, user.id));

    res.json({
      vendorSlugs: updated?.vendorSlugs ?? [],
      categorySlugs: updated?.categorySlugs ?? [],
      digestFrequency: updated?.digestFrequency ?? "none",
      alertKeywords: updated?.alertKeywords ?? [],
      emailAlerts: updated?.emailAlerts ?? false,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to update preferences" });
  }
});

export default router;
