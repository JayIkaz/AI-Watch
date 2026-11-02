-- Row Level Security policies for the tables added in 0003_square_umar.
-- Hand-written (RLS isn't part of the Drizzle schema model) but registered in
-- _journal.json like any other migration. Idempotent, so it is safe to run
-- whether or not it has already been applied by hand.
--
-- Same rationale as 0004_rls_policies.sql: the API server connects as a role
-- that bypasses RLS, so these are defence-in-depth for anon/authenticated only.
--
-- Both tables are public read: they carry no user data, only the mapping from
-- classifier strings to vendors and the resolved attribution.

ALTER TABLE "vendor_aliases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "news_item_vendors" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read" ON "vendor_aliases";
CREATE POLICY "public_read" ON "vendor_aliases" FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_read" ON "news_item_vendors";
CREATE POLICY "public_read" ON "news_item_vendors" FOR SELECT TO anon, authenticated USING (true);
