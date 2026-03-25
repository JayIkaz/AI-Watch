import { pgTable, text, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";

export const ingestionSourcesTable = pgTable("ingestion_sources", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  sourceType: text("source_type").notNull(), // rss, blog, changelog, x
  url: text("url").notNull(),
  active: boolean("active").notNull().default(true),
  lastCheckedAt: timestamp("last_checked_at"),
  lastSuccessAt: timestamp("last_success_at"),
  lastErrorAt: timestamp("last_error_at"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ingestionRunsTable = pgTable("ingestion_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  itemsProcessed: integer("items_processed").notNull().default(0),
  itemsCreated: integer("items_created").notNull().default(0),
  errors: integer("errors").notNull().default(0),
  status: text("status").notNull().default("running"), // running, completed, failed
});

export const insertIngestionSourceSchema = createInsertSchema(ingestionSourcesTable).omit({ id: true, createdAt: true });
export type InsertIngestionSource = z.infer<typeof insertIngestionSourceSchema>;
export type IngestionSource = typeof ingestionSourcesTable.$inferSelect;
