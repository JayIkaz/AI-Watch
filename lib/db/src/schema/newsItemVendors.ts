import { pgTable, integer, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { vendorsTable } from "./vendors";
import { newsItemsTable } from "./newsItems";

// Resolved attribution: which canonical vendors a news item is about.
//
// Materialised rather than derived at query time from
// unnest(mentioned_vendors) joined to vendor_aliases, because vendor pages
// filter by vendor on every request and the derived form cannot be indexed
// usefully. It also means a later change to the classifier's wording does not
// silently drop the attribution of items already ingested.
//
// Populated on ingest and backfilled by
// lib/db/runbooks/backfill-news-item-vendors.sql.
export const newsItemVendorsTable = pgTable("news_item_vendors", {
  newsItemId: integer("news_item_id").notNull().references(() => newsItemsTable.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.newsItemId, table.vendorId] }),
  index("news_item_vendors_vendor_id_idx").on(table.vendorId),
]);

export type NewsItemVendor = typeof newsItemVendorsTable.$inferSelect;
