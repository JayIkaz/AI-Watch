import { pgTable, text, integer, timestamp, serial, uniqueIndex, index } from "drizzle-orm/pg-core";

export const userLikesTable = pgTable("user_likes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  itemType: text("item_type", { enum: ["update", "news"] }).notNull(),
  itemId: integer("item_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("user_likes_user_idx").on(t.userId),
  uniqueIndex("user_likes_unique_idx").on(t.userId, t.itemType, t.itemId),
]);

export type UserLike = typeof userLikesTable.$inferSelect;
