import { pgTable, text, integer, boolean, timestamp, serial, real, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const newsCredibilityEnum = pgEnum("news_credibility", [
  "verified",
  "likely",
  "unverified",
  "gossip",
]);

export const newsSourceTypeEnum = pgEnum("news_source_type", [
  "major-outlet",
  "tech-blog",
  "newsletter",
  "social",
  "forum",
]);

export const newsItemsTable = pgTable("news_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  rawContent: text("raw_content"),
  sourceUrl: text("source_url"),
  sourceName: text("source_name").notNull(),
  sourceType: newsSourceTypeEnum("source_type").notNull().default("tech-blog"),
  credibilityRating: newsCredibilityEnum("credibility_rating").notNull().default("unverified"),
  credibilityReason: text("credibility_reason"),
  mentionedVendors: text("mentioned_vendors").array().default([]),
  publishedAt: timestamp("published_at"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  highInterest: boolean("high_interest").notNull().default(false),
  deduplicationHash: text("deduplication_hash").unique(),
}, (t) => [
  index("news_items_source_type_idx").on(t.sourceType),
  index("news_items_credibility_idx").on(t.credibilityRating),
  index("news_items_detected_at_idx").on(t.detectedAt),
]);

export const insertNewsItemSchema = createInsertSchema(newsItemsTable).omit({ id: true, detectedAt: true });
export type InsertNewsItem = z.infer<typeof insertNewsItemSchema>;
export type NewsItem = typeof newsItemsTable.$inferSelect;
export type NewsCredibility = "verified" | "likely" | "unverified" | "gossip";
export type NewsSourceType = "major-outlet" | "tech-blog" | "newsletter" | "social" | "forum";
