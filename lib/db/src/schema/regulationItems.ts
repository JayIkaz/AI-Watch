import { pgTable, text, timestamp, serial, real, date, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const regulationTypeEnum = pgEnum("regulation_type", [
  "legislation",
  "enforcement",
  "guidance",
  "court_ruling",
  "standards",
  "executive_action",
]);

export const jurisdictionEnum = pgEnum("jurisdiction", [
  "eu",
  "us_federal",
  "us_state",
  "uk",
  "china",
  "international",
]);

export const regulationUrgencyEnum = pgEnum("regulation_urgency", [
  "deadline_approaching",
  "enforcement_live",
  "proposed_draft",
  "adopted_future",
]);

export const regulationItemsTable = pgTable("regulation_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  whyItMatters: text("why_it_matters"),
  regulationType: regulationTypeEnum("regulation_type").notNull(),
  jurisdiction: jurisdictionEnum("jurisdiction").notNull(),
  jurisdictionDetail: text("jurisdiction_detail"),
  urgency: regulationUrgencyEnum("urgency").notNull(),
  deadlineDate: date("deadline_date"),
  deadlineLabel: text("deadline_label"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  lastVerified: timestamp("last_verified").notNull().defaultNow(),
  relevance: real("relevance"),
  affectedVendors: text("affected_vendors").array().default([]),
  sourceUrl: text("source_url"),
  sourceName: text("source_name"),
  deduplicationHash: text("deduplication_hash").unique(),
}, (t) => [
  index("regulation_items_type_idx").on(t.regulationType),
  index("regulation_items_jurisdiction_idx").on(t.jurisdiction),
  index("regulation_items_urgency_idx").on(t.urgency),
  index("regulation_items_deadline_idx").on(t.deadlineDate),
  index("regulation_items_detected_at_idx").on(t.detectedAt),
]);

export const insertRegulationItemSchema = createInsertSchema(regulationItemsTable).omit({ id: true, detectedAt: true });
export type InsertRegulationItem = z.infer<typeof insertRegulationItemSchema>;
export type RegulationItemRow = typeof regulationItemsTable.$inferSelect;
export type RegulationType = "legislation" | "enforcement" | "guidance" | "court_ruling" | "standards" | "executive_action";
export type Jurisdiction = "eu" | "us_federal" | "us_state" | "uk" | "china" | "international";
export type RegulationUrgency = "deadline_approaching" | "enforcement_live" | "proposed_draft" | "adopted_future";
