-- One-time data migration, not a schema migration — run manually against
-- Supabase during Phase 2 cutover, NOT via drizzle-kit.
--
-- Order of operations:
--   1. Apply drizzle/0000_calm_viper.sql, restore Replit backup data-only,
--      validate row counts (Phase 1).
--   2. Affected users sign in once via the new Supabase Auth flow (mints a
--      row in auth.users).
--   3. Run this file to populate user_id_mapping and remap ownership.
--   4. Only THEN apply drizzle/0001_drop_replit_auth_tables.sql — dropping
--      users/sessions before this backfill runs would destroy the email
--      values this join depends on.

-- Match on email: `users.email` was unique on the old Replit table, and
-- Supabase Auth also enforces a unique email per user.
INSERT INTO user_id_mapping (old_user_id, new_user_id)
SELECT u.id, au.id
FROM users u
JOIN auth.users au ON au.email = u.email
ON CONFLICT (old_user_id) DO NOTHING;

UPDATE api_keys
SET user_id = m.new_user_id::text
FROM user_id_mapping m
WHERE api_keys.user_id = m.old_user_id;

UPDATE user_likes
SET user_id = m.new_user_id::text
FROM user_id_mapping m
WHERE user_likes.user_id = m.old_user_id;

UPDATE user_preferences
SET user_id = m.new_user_id::text
FROM user_id_mapping m
WHERE user_preferences.user_id = m.old_user_id;

-- Sanity check: any rows left pointing at an old id with no mapping yet
-- (user hasn't signed in via Supabase Auth) — re-run this file after they do.
-- SELECT 'api_keys' AS table_name, count(*) FROM api_keys WHERE user_id NOT IN (SELECT new_user_id::text FROM user_id_mapping)
-- UNION ALL SELECT 'user_likes', count(*) FROM user_likes WHERE user_id NOT IN (SELECT new_user_id::text FROM user_id_mapping)
-- UNION ALL SELECT 'user_preferences', count(*) FROM user_preferences WHERE user_id NOT IN (SELECT new_user_id::text FROM user_id_mapping);
