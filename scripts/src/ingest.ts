import {
  runFullIngestion,
  runNewsIngestion,
  withAdvisoryLock,
  VENDOR_INGESTION_LOCK_KEY,
  NEWS_INGESTION_LOCK_KEY,
} from "@workspace/ingestion";

type Target = "vendors" | "news" | "both";

function parseTarget(): Target {
  const arg = process.argv.find((a) => a.startsWith("--target="));
  const value = arg?.split("=")[1] ?? "both";
  if (value !== "vendors" && value !== "news" && value !== "both") {
    throw new Error(`Invalid --target value: "${value}" (expected vendors|news|both)`);
  }
  return value;
}

async function runVendorIngestion() {
  console.log("[ingest] Acquiring vendor ingestion lock...");
  const outcome = await withAdvisoryLock(VENDOR_INGESTION_LOCK_KEY, () => runFullIngestion());
  if (outcome.skipped) {
    console.log("[ingest] Vendor ingestion already running elsewhere, skipped.");
    return;
  }
  console.log("[ingest] Vendor ingestion complete:", outcome.result);
}

async function runNewsIngestionJob() {
  console.log("[ingest] Acquiring news ingestion lock...");
  const outcome = await withAdvisoryLock(NEWS_INGESTION_LOCK_KEY, () => runNewsIngestion());
  if (outcome.skipped) {
    console.log("[ingest] News ingestion already running elsewhere, skipped.");
    return;
  }
  console.log("[ingest] News ingestion complete:", outcome.result);
}

async function main() {
  const target = parseTarget();
  console.log(`[ingest] Starting ingestion, target=${target}`);

  if (target === "vendors" || target === "both") {
    await runVendorIngestion();
  }
  if (target === "news" || target === "both") {
    await runNewsIngestionJob();
  }

  console.log("[ingest] Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[ingest] Fatal error:", err);
  process.exit(1);
});
