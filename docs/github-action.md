# Boris — GitHub Action Guide

The Boris GitHub Action measures the compiled size of your JavaScript/TypeScript packages on every pull request and reports the results to the Boris backend. The frontend then shows how bundle size evolves over time.

---

## How it works

For each pull request the action:

1. Builds the current branch.
2. Checks out the base branch (`main` by default) and builds it too.
3. Walks each package's `package.json` `exports` map to discover output files.
4. Computes the file size of each discovered output file on both branches.
5. `POST`s the diff to `POST /api/report` using the configured API key.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Boris account + repository linked | Create at [boris.example.com](https://boris.example.com) |
| API key | Created from the repository detail page in Boris |
| `npm run build` (or equivalent) | Must produce output files matching the `exports` map |

---

## Quick start

### 1. Create an API key in Boris

Open the repository detail page in the Boris dashboard and click **Create key**. Copy the key immediately — it is shown only once.

### 2. Add the secret to GitHub

Go to **Settings → Secrets and variables → Actions → New repository secret**:

- **Name**: `BORIS_API_KEY`
- **Value**: the `bbt_…` key you just copied

### 3. Add the workflow file

Create `.github/workflows/boris.yml`:

```yaml
name: Boris Bundle Tracker

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # needed to check out the base branch later

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build PR branch
        run: npm run build

      - name: Report bundle sizes to Boris
        uses: JoviDeCroock/boris-the-bundle-tracker/action@main
        with:
          api-key: ${{ secrets.BORIS_API_KEY }}
          # Boris API endpoint (default shown below)
          # api-url: https://api.example.com
          # Base branch to compare against (default: main)
          # base-branch: main
```

That's it. On the next pull request, Boris will record the bundle-size diff.

---

## Action inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `api-key` | yes | — | Boris API key (`bbt_…`) |
| `api-url` | no | `https://api.example.com` | Boris API base URL |
| `base-branch` | no | `main` | Branch to compare against |
| `working-directory` | no | `.` | Root of the npm workspace |
| `build-command` | no | `npm run build` | Command to build the packages |
| `install-command` | no | `npm ci` | Command to install dependencies |

---

## How packages and exports are discovered

The action looks for `package.json` files containing an `exports` field. For each entry in the exports map it resolves the output files and measures their size.

### Single-package repository

```
my-app/
├── package.json          ← discovered automatically
└── dist/
    ├── index.js
    └── index.mjs
```

### Monorepo

The action walks the `workspaces` (npm/Yarn) or `packages` (pnpm) globs defined in the root `package.json` / `pnpm-workspace.yaml` to discover individual packages.

```
my-monorepo/
├── package.json          ← workspaces: ["packages/*"]
└── packages/
    ├── ui/
    │   ├── package.json  ← discovered
    │   └── dist/
    └── icons/
        ├── package.json  ← discovered
        └── dist/
```

---

## Example `package.json` exports

The action reads the `exports` field to know which output files to measure:

```json
{
  "name": "@acme/ui",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./client": {
      "import": "./dist/client.mjs",
      "require": "./dist/client.js"
    }
  }
}
```

Each leaf value that points to a file path will be measured. Conditions (`import`, `require`, `browser`, `node`, etc.) are all included.

---

## Payload sent to Boris

The action sends a JSON payload to `POST /api/report`:

```json
{
  "repository": "acme/my-app",
  "prNumber": 42,
  "prTitle": "feat: add dark mode",
  "branch": "feat/dark-mode",
  "commitSha": "abc1234",
  "packages": [
    {
      "name": "@acme/ui",
      "path": "packages/ui",
      "exports": [
        {
          "exportPath": ".",
          "files": [
            { "file": "dist/index.mjs", "mainSize": 9600, "prSize": 10100 },
            { "file": "dist/index.js",  "mainSize": 10240, "prSize": 10850 }
          ]
        }
      ]
    }
  ]
}
```

See [api.md](./api.md#bundle-size-report) for the full API reference.

---

## Troubleshooting

### "Invalid API key"
Verify that the `BORIS_API_KEY` secret matches the key displayed in the Boris dashboard for this repository. Keys cannot be retrieved after creation; if lost, delete and recreate.

### "API key does not belong to this repository"
The API key is scoped to the repository you created it for. Make sure the `repository` field in the report payload (`owner/name`) exactly matches the repository linked in Boris.

### Build fails on base branch
If the base branch requires different build steps, set `build-command` to a more general command, or add a `.boris-build.sh` script at the repository root that the action will use if present.

### No files discovered
Ensure `package.json` has an `exports` field and that the build command produces the referenced output files.
