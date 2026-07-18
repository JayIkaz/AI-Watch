import express, { type Express } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";

const app: Express = express();

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

app.use("/api", router);

export default app;
