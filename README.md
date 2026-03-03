# Boris the Bundle Tracker

Boris is a hosted bundle-size tracker for JavaScript/TypeScript repositories. It compares package output sizes between a pull request branch and your base branch, then stores and visualizes the history so teams can spot regressions early.

## Why Boris?

- Track bundle-size changes per package, export, and file.
- See PR-level history and trends over time.
- Integrate directly into CI with a GitHub Action.
- Use repository-scoped API keys for report ingestion.
- Surface package size with a public SVG badge endpoint.

## Tech stack

| Layer    | Technology                             |
| -------- | -------------------------------------- |
| Frontend | Preact + Vite + Tailwind CSS           |
| Backend  | Hono on Cloudflare Workers             |
| Database | Cloudflare D1 (SQLite) via Drizzle ORM |
| Auth     | Better Auth                            |
| Billing  | Polar                                  |

## Repository structure

```text
boris-the-bundle-tracker/
├── api/            # Cloudflare Worker API
├── web/            # Preact frontend app + GitHub Action source
├── docs/           # Architecture, API, and integration docs
└── setup.sh        # Local setup helper
```

## Prerequisites

- Node.js 20+
- pnpm
- Cloudflare account (for Workers + D1)
- Polar account (if you want to test billing flows locally)

## Quick start

```bash
./setup.sh
```

`setup.sh` will:

1. Copy `api/.dev.vars.example` → `api/.dev.vars` (if missing)
2. Copy `web/.env.example` → `web/.env` (if missing)
3. Install dependencies
4. Generate and apply local D1 migrations

Then edit your local environment values as needed.

## Manual local setup

If you prefer to run each step yourself:

### 1) Install dependencies

```bash
pnpm install
```

### 2) Create env files

```bash
cp api/.dev.vars.example api/.dev.vars
cp web/.env.example web/.env
```

Suggested minimum local values:

- `api/.dev.vars`
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL=http://localhost:8787/api/auth`
  - `POLAR_*` values (required for billing routes)
  - `ADMIN_EMAILS`
- `web/.env`
  - `VITE_API_BASE_URL=http://localhost:8787`

### 3) Generate schema and run migrations

```bash
cd api
pnpm run db:generate
pnpm run db:migrate:local
```

### 4) Start the apps

Use separate terminals:

```bash
# API (Cloudflare Worker dev server)
cd api && pnpm run dev

# Web app (Vite)
cd web && pnpm run dev
```

Open `http://localhost:5173`.

## Useful scripts

### Workspace-level

```bash
pnpm run dev           # Run web + api concurrently
pnpm run lint          # oxlint --fix
pnpm run format        # oxfmt --write .
pnpm run format:check  # oxfmt --check .
pnpm run check         # lint + format check
```

### API (`api/`)

```bash
pnpm run dev               # Wrangler dev
pnpm run deploy            # Deploy worker
pnpm run cf-typegen        # Regenerate Cloudflare binding types
pnpm run db:generate       # Drizzle migration generation
pnpm run db:migrate:local  # Apply local D1 migrations
pnpm run db:migrate:remote # Apply remote D1 migrations
pnpm run db:seed           # Seed script
pnpm run db:studio         # Drizzle Studio
```

### Web (`web/`)

```bash
pnpm run dev
pnpm run build
pnpm run preview
```

## GitHub Action integration

Boris ships with a GitHub Action that:

1. Builds your PR branch
2. Builds your base branch
3. Discovers package outputs from `exports`
4. Measures file-size deltas
5. Reports results to `POST /api/report`

See **[`docs/github-action.md`](docs/github-action.md)** for complete setup, required secrets, action inputs, and payload examples.

## API and architecture docs

- **[`docs/api.md`](docs/api.md)**: endpoint reference and payload schemas
- **[`docs/architecture.md`](docs/architecture.md)**: data model and system architecture
- **[`docs/feature-improvements.md`](docs/feature-improvements.md)**: planned and candidate improvements

## Deployment notes

- API is designed for Cloudflare Workers with D1.
- Configure production bindings and secrets in `api/wrangler.jsonc` and your Cloudflare dashboard.
- Run remote migrations before or during deployment:

```bash
cd api && pnpm run db:migrate:remote
```

## License

No license file is currently included in this repository. Add one before publishing or external distribution.
