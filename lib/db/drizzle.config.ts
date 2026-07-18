import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// drizzle-kit resolves `schema` as a glob, which needs forward slashes even
// on Windows — path.join's backslashes silently match zero files there.
const schemaPath = path.join(__dirname, "./src/schema/index.ts").split(path.sep).join("/");

export default defineConfig({
  schema: schemaPath,
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
