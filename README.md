# Aukizan (AI Watch)

Aukizan tracks what the major AI vendors announce and puts it in one feed: model releases, API changes, pricing, safety, research and product news, plus AI regulation. Each item is classified and summarised by Claude, with a short note on why it matters.

Live at [aukizan.com](https://aukizan.com).

## What's in the repo

A pnpm workspace monorepo, written in TypeScript.

```text
artifacts/
  aiwatch/                 React + Vite frontend
  api-server/              Express 5 API (deployed to Vercel as a single function)
  mockup-sandbox/          Design mockups
lib/
  api-spec/                OpenAPI spec and Orval codegen config
  api-client-react/        Generated React Query hooks and fetch client
  api-zod/                 Generated Zod schemas
  db/                      Drizzle ORM schema, migrations and runbooks
  ingestion/               Vendor and news ingestion (RSS and API sources)
  integrations-anthropic-ai/  Claude client used for classification and summaries
scripts/                   Seed, ingest and backfill scripts
.github/workflows/         Scheduled ingestion and logo backfill
```

## Stack

- **Frontend:** React, Vite, React Query, Tailwind CSS
- **API:** Express 5, validated with Zod, client and schemas generated from `lib/api-spec/openapi.yaml`
- **Database:** PostgreSQL (Supabase) with Drizzle ORM
- **Auth:** Supabase Auth, with the API verifying the Supabase JWT
- **AI:** Anthropic Claude for classification and summarisation
- **Hosting:** Vercel (frontend and API as separate projects)
- **Tooling:** pnpm 10, Node.js 24, TypeScript 5.9, esbuild

## Getting started

Requires Node.js 24 and pnpm. The repo refuses `npm` and `yarn` installs.

```bash
pnpm install
pnpm run typecheck
```

Copy the environment variables below into your shell or an `.env` file, then:

```bash
# Push the database schema
pnpm --filter @workspace/db run push

# Seed vendors, categories and sample updates
pnpm --filter @workspace/scripts run seed

# Run the API (builds, then starts)
pnpm --filter @workspace/api-server run dev

# Run the frontend
pnpm --filter @workspace/aiwatch run dev
```

### Useful scripts

| Command | What it does |
| --- | --- |
| `pnpm run build` | Typecheck, then build every package |
| `pnpm run typecheck` | Typecheck the whole workspace from the root |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate the API client and Zod schemas after editing the OpenAPI spec |
| `pnpm --filter @workspace/db run generate` | Generate a Drizzle migration |
| `pnpm --filter @workspace/scripts run ingest` | Run ingestion manually |
| `pnpm --filter @workspace/scripts run seed-regulations` | Seed regulation entries |
| `pnpm --filter @workspace/scripts run backfill-logos` | Backfill vendor logos |

Always typecheck from the root. Every package extends `tsconfig.base.json` and uses project references.

## Environment variables

### API server

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_JWT_SECRET` | Used to verify Supabase-issued JWTs |
| `ANTHROPIC_API_KEY` | Claude API key for classification and summaries |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `ADMIN_EMAILS` | Emails treated as admins |
| `DATABASE_POOL_URL` | Optional. The same Supabase pooler in transaction mode (port 6543), used for ordinary queries so they stop counting against the session-mode connection cap. Falls back to `DATABASE_URL` when unset |
| `DATABASE_POOL_MAX` | Optional. Maximum database connections per instance |
| `LOG_LEVEL` | Optional. Log verbosity |

### Frontend (build time)

| Variable | Purpose |
| --- | --- |
| `VITE_API_ORIGIN` | Base URL of the API |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |

Never commit real values. Keep secrets in Vercel, GitHub Actions secrets or a local `.env` that is git-ignored.

## API

All routes are mounted under `/api`. The full contract is in [`lib/api-spec/openapi.yaml`](lib/api-spec/openapi.yaml).

| Route | Description |
| --- | --- |
| `GET /api/healthz` | Health check |
| `GET /api/v1/updates` | Paginated feed, filterable by vendor, category and search |
| `GET /api/v1/updates/:id` | Single update |
| `GET /api/v1/vendors`, `/vendors/:slug`, `/vendors/counts` | Vendor directory, detail and counts |
| `GET /api/v1/categories` | Categories with update counts |
| `GET /api/v1/news` | News items |
| `GET /api/v1/regulations` | AI regulation tracker |
| `GET /api/v1/ingestion/status`, `/news/status` | Ingestion pipeline status |

Signed-in routes cover user preferences and API keys (`/api/v1/users/preferences`, `/api/v1/apikeys`). Public read routes are edge-cached.

## Ingestion

A GitHub Actions workflow (`.github/workflows/ingest.yml`) runs ingestion at 17 minutes past every sixth hour. It can also be started by hand from the Actions tab, with the target set to `vendors`, `news` or both. Runs are serialised so two never overlap.

## Deployment

The frontend and the API are deployed as separate Vercel projects from the same repository. Merging to `master` deploys to production. The API runs as a single serverless function (`artifacts/api-server/api/index.js`) with all paths rewritten to it.

## Contributing

Open a pull request against `master`. Run `pnpm run typecheck` first.

## Licence

Copyright (c) Aukizan. All rights reserved. No licence is granted to use, copy, modify or distribute this code without written permission.
