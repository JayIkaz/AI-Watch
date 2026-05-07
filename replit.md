# AIWatch — Unified AI Update Intelligence Platform

## User Preferences

- Always notify the user when changes require republishing the app to take effect in production.

## Overview

pnpm workspace monorepo using TypeScript. AIWatch aggregates news, model releases, API changes, and pricing updates from 20+ major AI vendors into a single feed with AI-powered (Claude) classification, summarization, Replit Auth, API key management, and an ingestion pipeline.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + React Query + Tailwind CSS
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle for API server), Vite (frontend)
- **Auth**: Replit Auth (OpenID Connect / PKCE)
- **AI**: Anthropic Claude (via Replit AI Integrations) for update classification

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── aiwatch/             # React + Vite frontend (previewPath: /)
│   └── api-server/          # Express API server (port 8080)
├── lib/
│   ├── api-spec/            # OpenAPI spec + Orval codegen config
│   ├── api-client-react/    # Generated React Query hooks + fetch client
│   ├── api-zod/             # Generated Zod schemas from OpenAPI spec
│   └── db/                  # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/seed.ts          # DB seed script (vendors, categories, sample updates)
├── pnpm-workspace.yaml
├── tsconfig.base.json       # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json            # Root TS project references
└── package.json
```

## Database Schema

- **vendors** — 18 AI vendors (Anthropic, OpenAI, Google DeepMind, Meta, Mistral, DeepSeek, Replit, Perplexity, xAI + 9 Tier-2)
- **categories** — 6 categories: model-release (#3B82F6), api-changelog (#F97316), pricing (#22C55E), safety (#A855F7), research (#6366F1), product (#EC4899)
- **updates** — AI updates with title, summary, category, vendor, source URL, published date
- **users** — Auth users (id, email, firstName, lastName, profileImageUrl)
- **userPreferences** — Per-user notification/filter preferences
- **apiKeys** — User-scoped API keys for programmatic access
- **ingestionSources** — RSS/API sources for each vendor

## API Routes (all mounted at `/api`)

- `GET /api/healthz` — health check
- `GET /api/auth/user` — current session user (null if unauthenticated)
- `GET /api/login` — OIDC login redirect
- `GET /api/callback` — OIDC callback
- `GET /api/logout` — logout + end session
- `POST /api/mobile-auth/token-exchange` — mobile PKCE token exchange
- `POST /api/mobile-auth/logout` — mobile logout
- `GET /api/auth/me` — current user profile (requires auth)
- `GET /api/v1/vendors` — list vendors (filter by tier, active)
- `GET /api/v1/vendors/:slug` — vendor detail + recent updates
- `GET /api/v1/categories` — list categories with update counts
- `GET /api/v1/updates` — paginated feed (filter by vendor, category, search)
- `GET /api/v1/updates/:id` — single update detail
- `PATCH /api/v1/updates/:id/flag` — flag/unflag an update
- `GET /api/v1/users/preferences` — get user preferences (auth required)
- `PUT /api/v1/users/preferences` — update user preferences (auth required)
- `GET /api/v1/apikeys` — list user API keys (auth required)
- `POST /api/v1/apikeys` — create API key (auth required)
- `DELETE /api/v1/apikeys/:id` — delete API key (auth required)
- `GET /api/v1/ingestion/status` — ingestion pipeline status
- `POST /api/v1/ingestion/trigger` — trigger manual ingestion (auth required)

## Frontend Pages

- `/` — Landing/Login (unauthenticated) or Feed (authenticated)
- `/feed` — Main update feed with filtering by category and vendor
- `/vendors` — Vendor directory with tier badges and stats
- `/vendors/:slug` — Vendor detail page
- `/categories` — Category overview
- `/settings` — User preferences and API key management

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only `.d.ts` files during typecheck; JS bundling by esbuild/Vite
- **Project references** — cross-package imports resolved via `references` in tsconfig

## Key Scripts

- `pnpm run build` — typecheck + recursive build
- `pnpm run typecheck` — `tsc --build --emitDeclarationOnly`
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/scripts run seed` — seed the database

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection (auto-provided by Replit)
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Anthropic proxy URL (auto via Replit AI integration)
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Anthropic API key (auto via Replit AI integration)
- `REPL_ID` — Used for Replit Auth OIDC client ID
- `SESSION_SECRET` — Secret for session signing (set in Replit Secrets)
