import { pgTable, text, integer, boolean, timestamp, serial, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";
import { categoriesTable } from "./categories";

export const updatesTable = pgTable("updates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  rawContent: text("raw_content"),
  sourceUrl: text("source_url"),
  publishedAt: timestamp("published_at"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  confidenceScore: real("confidence_score"),
  classificationReasoning: text("classification_reasoning"),
  flaggedForReview: boolean("flagged_for_review").notNull().default(false),
  highImpact: boolean("high_impact").notNull().default(false),
  whyItMatters: text("why_it_matters"),
  deduplicationHash: text("deduplication_hash").unique(),
}, (t) => [
  index("updates_vendor_idx").on(t.vendorId),
  index("updates_category_idx").on(t.categoryId),
  index("updates_detected_at_idx").on(t.detectedAt),
  index("updates_published_at_idx").on(t.publishedAt),
]);

export const insertUpdateSchema = createInsertSchema(updatesTable).omit({ id: true, detectedAt: true });
export type InsertUpdate = z.infer<typeof insertUpdateSchema>;
export type Update = typeof updatesTable.$inferSelect;
