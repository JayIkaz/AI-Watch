import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
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
// TODO(phase-6): once the frontend's Vercel project exists, confirm its exact
// preview-URL pattern (e.g. https://aiwatch-<hash>-<team>.vercel.app) and add
// it here as a regex — do not guess it before the project is live.
const allowedOriginPatterns: RegExp[] = [];

app.use(cors({
  // No cookies involved (auth is a Bearer token in the Authorization header,
  // which CORS doesn't gate) — credentials:true is not needed.
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || allowedOriginPatterns.some((p) => p.test(origin))) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin not allowed: ${origin}`));
  },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

export default app;
