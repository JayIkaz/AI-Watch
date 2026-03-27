import { pgTable, text, integer, boolean, timestamp, serial, index } from "drizzle-orm/pg-core";
import { newsSourceTypeEnum, newsCredibilityEnum } from "./newsItems";

export const newsSourcesTable = pgTable("news_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull().unique(),
  sourceType: newsSourceTypeEnum("source_type").notNull().default("tech-blog"),
  defaultCredibility: newsCredibilityEnum("default_credibility").notNull().default("unverified"),
  active: boolean("active").notNull().default(true),
  lastCheckedAt: timestamp("last_checked_at"),
  lastSuccessAt: timestamp("last_success_at"),
  lastErrorAt: timestamp("last_error_at"),
  lastError: text("last_error"),
}, (t) => [
  index("news_sources_active_idx").on(t.active),
]);
