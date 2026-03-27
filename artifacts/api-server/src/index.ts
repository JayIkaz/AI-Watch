import app from "./app";
import { logger } from "./lib/logger";
import { autoSeed } from "./lib/seed";
import { runFullIngestion } from "./routes/ingestion";
import { runNewsIngestion } from "./routes/news";

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

const INGESTION_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const STARTUP_DELAY_MS = 2 * 60 * 1000; // 2 minutes after boot

async function startupRoutine() {
  await autoSeed((msg) => logger.info(msg)).catch((err) => {
    logger.warn({ err }, "Auto-seed failed (non-fatal)");
  });

  // Run initial ingestion after a short delay to let DB settle
  setTimeout(async () => {
    logger.info("Starting scheduled vendor ingestion run");
    await runFullIngestion().catch((err) => {
      logger.warn({ err }, "Scheduled vendor ingestion failed");
    });

    logger.info("Starting scheduled news ingestion run");
    await runNewsIngestion().catch((err) => {
      logger.warn({ err }, "Scheduled news ingestion failed");
    });

    // Then run every 6 hours
    setInterval(async () => {
      logger.info("Starting scheduled vendor ingestion run");
      await runFullIngestion().catch((err) => {
        logger.warn({ err }, "Scheduled vendor ingestion failed");
      });

      logger.info("Starting scheduled news ingestion run");
      await runNewsIngestion().catch((err) => {
        logger.warn({ err }, "Scheduled news ingestion failed");
      });
    }, INGESTION_INTERVAL_MS);
  }, STARTUP_DELAY_MS);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startupRoutine().catch((err) => {
    logger.error({ err }, "Startup routine failed");
  });
});
