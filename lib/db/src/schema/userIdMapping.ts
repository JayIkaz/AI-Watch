import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";

// One-time migration aid: maps old Replit-OIDC users.id (text) to the new
// Supabase Auth auth.users.id (uuid) so apiKeys/userLikes/userPreferences
// rows can be backfilled to the new identity without losing ownership.
// Kept after migration for audit/rollback, not dropped.
export const userIdMappingTable = pgTable("user_id_mapping", {
  oldUserId: text("old_user_id").primaryKey(),
  newUserId: uuid("new_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserIdMapping = typeof userIdMappingTable.$inferSelect;
