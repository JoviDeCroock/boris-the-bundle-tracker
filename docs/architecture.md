# Boris — Architecture

## Overview

Boris is a bundle-size tracker for npm packages. It records how the compiled size of each JavaScript/TypeScript package changes across pull requests, giving teams a clear picture of bundle growth over time.

```
GitHub PR  ──(GitHub Action)──▶  Boris API  ──▶  Cloudflare D1
                                     │
                              Frontend (Preact)
```

---

## Monorepo structure

```
boris-the-bundle-tracker/
├── api/          Hono + Cloudflare Workers backend
├── web/          Preact + Vite frontend
└── docs/         Documentation (this directory)
```

---

## Data model

```
user  ─────────────────────────────────────── n
      └── user_repository (junction) ─────── n
              └── repository ────────────────────── 1
                      ├── api_key ─────────── n
                      └── package ─────────── n
                              └── package_evolution ── n
```

### `user`
Standard BetterAuth user (email + password). Managed by the auth framework.

### `repository`
A GitHub repository (`owner`/`name`) tracked by Boris. Repositories are shared: the same GitHub repository can be linked by multiple users; a junction table (`user_repository`) records the association.

### `user_repository`
Many-to-many join between users and repositories.

| Column | Type | Notes |
|---|---|---|
| user_id | text PK | FK → user |
| repository_id | text PK | FK → repository |
| created_at | timestamp | |

### `api_key`
Scoped to a repository. Used by the GitHub Action to authenticate `POST /api/report`. The full key (`bbt_<64 hex chars>`) is shown only once at creation time; only its SHA-256 hash is stored in the database.

| Column | Type | Notes |
|---|---|---|
| id | text PK | UUID |
| repository_id | text | FK → repository |
| name | text | Human-readable label |
| key_hash | text unique | SHA-256 of the raw key |
| key_prefix | text | First 12 chars for display |
| created_at | timestamp | |
| last_used_at | timestamp | Updated on each report |

### `package`
An npm package (identified by its `package.json` `name`) within a repository. For monorepos, `path` contains the relative directory of the package (e.g. `packages/ui`). Packages are upserted automatically when the GitHub Action submits a report.

| Column | Type | Notes |
|---|---|---|
| id | text PK | UUID |
| repository_id | text | FK → repository |
| name | text | Package name from package.json |
| path | text? | Relative path in monorepo |
| created_at | timestamp | |
| updated_at | timestamp | |

### `package_evolution`
One record per *(package, PR, export path, file)*. Records the compiled size on the base branch (`main_size`) and on the PR branch (`pr_size`), allowing the diff to be computed at query time.

| Column | Type | Notes |
|---|---|---|
| id | text PK | UUID |
| package_id | text | FK → package |
| pr_number | integer | GitHub PR number |
| pr_title | text? | PR title |
| branch | text | Feature branch name |
| commit_sha | text | Head commit of the PR |
| export_path | text | Export map key, e.g. `"."` |
| file_name | text | Output file, e.g. `"dist/index.js"` |
| main_size | integer | Bytes on base branch |
| pr_size | integer | Bytes on PR branch |
| reported_at | timestamp | When the Action submitted |

---

## Backend (`api/`)

**Runtime**: Cloudflare Workers (edge, serverless)
**Framework**: Hono
**Database**: Cloudflare D1 (SQLite) via Drizzle ORM
**Auth**: BetterAuth (email + password, session cookies)

### Route groups

| Mount | Auth | Description |
|---|---|---|
| `/api/auth/*` | — | BetterAuth endpoints (sign-in, sign-up, …) |
| `/api/billing-success` | — | Polar checkout redirect handler |
| `/api/v1/*` | Session cookie | Protected endpoints (below) |
| `/api/report` | Bearer API key | Bundle-size report from GitHub Action |

### Protected endpoints (`/api/v1/`)

```
GET    /repositories                          List linked repositories
POST   /repositories                          Link a repository
DELETE /repositories/:id                      Unlink a repository

GET    /repositories/:id/api-keys             List API keys
POST   /repositories/:id/api-keys             Create an API key
DELETE /repositories/:id/api-keys/:keyId      Delete an API key

GET    /repositories/:id/packages             List packages
GET    /repositories/:id/packages/:pkgId/evolutions  Size history
DELETE /repositories/:id/packages/:pkgId      Delete a package
```

---

## Frontend (`web/`)

**Framework**: Preact 10
**Build**: Vite with SSR prerendering
**Styling**: Tailwind CSS v4
**State**: Preact Signals (`@preact/signals`)
**Routing**: preact-iso

### Pages

| Path | Component | Description |
|---|---|---|
| `/` | `Home` | Landing page |
| `/auth` | `Auth` | Sign-in / sign-up |
| `/dashboard` | `Dashboard` | Repository list |
| `/repository/:id` | `RepositoryPage` | Packages, API keys, setup guide |
| `/billing` | `Billing` | Subscription management |

### Key models (Preact Signals)

| Model | File | Responsibility |
|---|---|---|
| `AuthModel` | `models/auth.ts` | Session state, sign-out |
| `RepositoriesModel` | `models/repositories.ts` | Repos, API keys, packages, evolutions |
| `BillingModel` | `models/billing.ts` | Subscription plan and upgrade |

---

## Subscription tiers

| Limit | Free | Pro |
|---|---|---|
| Repositories | 3 | 50 |
| API keys per repo | 2 | 10 |
| History retained | 30 days | 365 days |

---

## Local development

```bash
# Install dependencies
pnpm install

# Start API + frontend concurrently
pnpm dev
```

API runs on `http://localhost:8787`, frontend on `http://localhost:5173`.

Copy `api/.dev.vars.example` → `api/.dev.vars` and fill in values before starting the API.

### Apply migrations (local D1)

```bash
cd api
npx wrangler d1 migrations apply app-db --local
```
