import { pgTable, text, integer, timestamp, serial, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";

// Maps the free-text strings that appear in news_items.mentioned_vendors onto
// canonical vendors. The classifier emits whatever it likes ("Claude",
// "ChatGPT", "HuggingFace", "Grok"), none of which matched the vendors table,
// so vendor-attributed news was invisible even though the data was there.
//
// `alias` is stored lower-cased and compared lower-cased. Matching is exact,
// not substring: substring matching maps "GPT" onto every "ChatGPT" story and
// "Meta" onto "Metaverse".
//
// Deliberately NOT aliased: "Google" -> Google DeepMind, "Microsoft" -> Azure
// AI, "AWS" -> AWS Bedrock. Those are parent brands whose news is mostly about
// something else (Maps, Search, Copilot, Ring), and attributing it to the AI
// subsidiary makes vendor pages majority-irrelevant.
export const vendorAliasesTable = pgTable("vendor_aliases", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id, { onDelete: "cascade" }),
  alias: text("alias").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("vendor_aliases_vendor_id_idx").on(table.vendorId),
]);

export const insertVendorAliasSchema = createInsertSchema(vendorAliasesTable).omit({ id: true, createdAt: true });
export type InsertVendorAlias = z.infer<typeof insertVendorAliasSchema>;
export type VendorAlias = typeof vendorAliasesTable.$inferSelect;
