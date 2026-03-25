import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userPreferencesTable = pgTable("user_preferences", {
  userId: text("user_id").primaryKey(),
  vendorSlugs: text("vendor_slugs").array().notNull().default([]),
  categorySlugs: text("category_slugs").array().notNull().default([]),
  digestFrequency: text("digest_frequency").notNull().default("none"),
  alertKeywords: text("alert_keywords").array().notNull().default([]),
  emailAlerts: boolean("email_alerts").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferencesTable);
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferencesTable.$inferSelect;
