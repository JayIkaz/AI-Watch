import app from "./app";
import { logger } from "./lib/logger";
import { autoSeed } from "./lib/seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Ingestion scheduling no longer happens in-process — GitHub Actions
// (.github/workflows/ingest.yml) owns the 6h cron entirely, so a restart or
// serverless cold start can no longer double-run or silently drop a cycle.
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  autoSeed((msg) => logger.info(msg)).catch((err) => {
    logger.warn({ err }, "Auto-seed failed (non-fatal)");
  });
});
