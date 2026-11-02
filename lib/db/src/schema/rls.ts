import { sql } from "drizzle-orm";
import { pgPolicy } from "drizzle-orm/pg-core";

// Public read-only policy for Supabase's anon and authenticated roles.
//
// Row Level Security is declared in the schema so that `drizzle-kit push` and
// `generate` agree with the database. Without these declarations, `push`
// treats every RLS setting and policy as drift and DISABLES / DROPS them, which
// silently re-exposes the tables to the public API key.
//
// The API server and ingestion job connect with a role that bypasses RLS, so
// this only governs direct access with the anon/authenticated keys. Tables with
// no policy are default-deny for those roles.
//
// Returns a new policy each call: Drizzle binds a policy to a single table.
export const publicRead = () =>
  pgPolicy("public_read", {
    for: "select",
    to: ["anon", "authenticated"],
    using: sql`true`,
  });
