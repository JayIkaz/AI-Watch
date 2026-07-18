import rateLimit from "express-rate-limit";

// In-memory store — best-effort only across multiple serverless instances /
// cold starts. Acceptable here: this only guards low-traffic admin routes
// (ingestion trigger, content flagging), not a general API rate limit.
export const adminTriggerRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
