import express, { type Express } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";
import { publicCache } from "./middlewares/publicCache";

const app: Express = express();

// Running behind Vercel's proxy — trust its X-Forwarded-For so express-rate-limit
// (and req.ip generally) sees the real client IP instead of refusing to start.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const DEFAULT_ALLOWED_ORIGINS = ["https://aukizan.com", "https://www.aukizan.com"];
const allowedOrigins = [
  ...DEFAULT_ALLOWED_ORIGINS,
  ...(process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
];
// Vercel preview/branch deployments for the aiwatch frontend project, e.g.
// https://ai-watch-aiwatch-git-supabase-migration-aukizan.vercel.app or
// https://ai-watch-aiwatch-<hash>-aukizan.vercel.app.
const allowedOriginPatterns: RegExp[] = [/^https:\/\/ai-watch-aiwatch-[a-z0-9-]+-aukizan\.vercel\.app$/];

app.use(cors({
  // Cache the CORS preflight. Calling the API cross-origin means any request
  // carrying a non-safelisted header (Authorization, above all) is preceded by
  // an OPTIONS preflight. Without a max-age the browser repeats that preflight
  // constantly, which would add back the edge requests this change removes.
  // Browsers cap this themselves (Chrome at 2 hours); the value is an upper
  // bound, not a promise.
  maxAge: 86400,
  // No cookies involved (auth is a Bearer token in the Authorization header,
  // which CORS doesn't gate) — credentials:true is not needed.
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || allowedOriginPatterns.some((p) => p.test(origin))) {
      callback(null, true);
      return;
    }
    // Reject without throwing — an Error passed to this callback propagates
    // as an unhandled exception (bare 500), not a clean CORS rejection.
    callback(null, false);
  },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

// Edge caching for public read routes. None of these depend on the caller.
// Status routes get a short window so "is ingestion running" stays current.
const listCache = publicCache(60, 300);
const slowCache = publicCache(300, 600);
const statusCache = publicCache(10, 30);
// Register specific paths before patterns: the first matching policy wins.
app.get(["/api/v1/ingestion/status", "/api/v1/news/status"], statusCache);
app.get(["/api/v1/vendors", "/api/v1/vendors/counts", "/api/v1/categories"], slowCache);
app.get(["/api/v1/updates", "/api/v1/updates/:id", "/api/v1/news", "/api/v1/regulations", "/api/v1/vendors/:slug"], listCache);

app.use("/api", router);

export default app;
