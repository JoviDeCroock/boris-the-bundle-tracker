# Product Template

A full-stack SaaS starter kit with authentication, billing, and a dashboard — ready to build on.

## Tech Stack

| Layer    | Technology                           |
| -------- | ------------------------------------ |
| Frontend | Preact, Vite, Tailwind CSS           |
| Backend  | Hono (Cloudflare Workers)            |
| Database | Drizzle ORM + Cloudflare D1 (SQLite) |
| Auth     | BetterAuth (email/password)          |
| Billing  | Polar (free/pro plans, webhooks)     |

## Project Structure

```
├── web/          Preact frontend (Vite)
│   └── src/
│       ├── components/   UI components
│       ├── pages/        Route pages (Home, Auth, Dashboard, Billing)
│       ├── models/       Signal-based models (auth, billing, subscription)
│       └── lib/          Auth client, API client, constants
├── api/          Hono backend (Cloudflare Workers)
│   └── src/
│       ├── db/           Drizzle schema
│       ├── lib/          Auth setup, plan logic
│       ├── routes/       API routes
│       └── utils/        Helpers
└── package.json  Root scripts (lint, format)
```

## Quick Start

```sh
./setup.sh
```

This copies the env files for both the API and frontend, and installs dependencies. Then follow the steps below to fill in your keys.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- A [Cloudflare](https://dash.cloudflare.com) account (free tier works)

### 1. Install dependencies

```sh
pnpm install
```

### 2. Set up environment files

Copy the example env files:

```sh
cp api/.dev.vars.example api/.dev.vars
cp web/.env.example web/.env
```

### 3. Set up the database

Generate the schema and run migrations against the local D1 database:

```sh
cd api
pnpm run db:generate
pnpm run db:migrate:local
```

### 4. Run locally

Start both servers in separate terminals:

```sh
# Terminal 1 — API (port 8787)
cd api && pnpm dev

# Terminal 2 — Frontend (port 5173)
cd web && pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Lint & Format

```sh
pnpm -w run lint         # oxlint with auto-fix
pnpm -w run format       # oxfmt write
pnpm -w run check        # lint + format check (CI)
```
