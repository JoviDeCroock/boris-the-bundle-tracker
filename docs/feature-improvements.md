# Boris — Feature Analysis & Improvement Suggestions

## Current Feature Inventory

### GitHub Action (`web/action/index.js`)

| Feature | Notes |
|---|---|
| Raw, gzip, brotli measurement | All three sizes measured per output file |
| Dual-build (PR branch vs base branch) | Checks out base branch, builds, restores |
| Package manager auto-detection | npm, pnpm, yarn, bun |
| Monorepo workspace discovery | npm/yarn `workspaces`, pnpm `pnpm-workspace.yaml` |
| Legacy `main`/`module` field fallback | For packages without an `exports` map |
| Content hash normalization | Strips build-time hashes so files match across builds |
| Idempotent on re-run | PATCH for closed PR; POST upserts on same commit SHA |
| Custom `.boris-build.sh` override | Repo-specific build script support |
| Configurable inputs | `api-key`, `base-branch`, `working-directory`, `build-command`, `install-command` |

### API (`api/src/`)

| Feature | Notes |
|---|---|
| Bearer API key auth on `POST /api/report` | SHA-256 hashed; prefix stored for display |
| Session cookie auth on `/api/v1/*` | Managed by BetterAuth |
| Repository CRUD | Link/unlink; shared across users via junction table |
| API key management | Create (shown once), delete, list with `lastUsedAt` |
| Package auto-creation | Upserted on first report |
| Evolution history endpoint | Grouped by PR, scoped to latest commit SHA per PR |
| PR state tracking | `open` / `closed` / `prMerged` boolean |
| `PATCH /api/report` | Lightweight state update without rebuild on PR close |
| Per-PR and per-package delete | Manual cleanup from dashboard |

### Frontend (`web/src/`)

| Feature | Notes |
|---|---|
| Dashboard with repository list | Overview of linked repos |
| Repository detail page | Packages, API keys, setup guide panels |
| Bundle size SVG chart | Per-file lines across merged PRs; raw/gzip/brotli toggle |
| Evolutions table | Per-PR rows with status badges, size columns, diff badge |
| Action menu per PR | Mark as merged, delete PR history |
| Setup instructions panel | Step-by-step workflow guide |
| Action files modal | Auto-generates `boris.yml` workflow YAML |
| Size formatting | Human-readable B / KB / MB |
| Gzip-preferred diff badge | Falls back to raw if gzip unavailable |

### Auth & Billing

| Feature | Notes |
|---|---|
| Email/password auth | BetterAuth |
| Free / Pro tiers | Via Polar |
| Repo limit | 3 (free) / 50 (pro) |
| API keys per repo | 2 (free) / 10 (pro) |
| History retention | 30 days (free) / 365 days (pro) — **defined but not enforced** |

---

## Identified Gaps & Improvement Suggestions

### 1. GitHub PR Comments (high impact)

**Gap**: The action reports data to Boris but gives no signal inside GitHub itself. Developers must visit the external dashboard to see results.

**Suggestion**: Add an optional step in the action that posts a formatted Markdown comment to the PR via the GitHub API. The comment would show a compact diff table (package, file, main size, PR size, % change) similar to what bundlesize and size-limit produce. Subsequent pushes to the same PR should update (not re-post) the existing comment using the comment ID stored in the action's output.

Required change: add `pull-requests: write` to the action's recommended permissions block and a new `post-comment` boolean input (default `true`).

---

### 2. GitHub Commit Status Checks (high impact)

**Gap**: There is no pass/fail signal on the PR. The action always exits 0 regardless of how much the bundle grew.

**Suggestion**: Post a GitHub commit status (`statuses` API) with the overall bundle delta summary (e.g., `Boris: +3.2 KB gzip (+4.1%)`). Pair this with a configurable budget so the status can flip to `failure` when a threshold is exceeded, giving teams a mandatory gate without the overhead of a separate size-limit tool.

---

### 3. Size Budgets / Per-package Configuration

**Gap**: There is no way to declare acceptable size thresholds. Every PR is treated equally regardless of how much it grows the bundle.

**Suggestion**: Support a `.boris.json` (or `boris` key in `package.json`) config file at the repository root:

```json
{
  "budgets": [
    { "package": "@acme/ui", "exportPath": ".", "maxGzipSize": "50 KB" },
    { "package": "*", "maxIncrease": "5%" }
  ]
}
```

The action reads this config, compares against the measured diff, and fails (or warns) when a budget is exceeded. Results should be reflected in the PR comment and commit status.

---

### 4. History Retention Enforcement

**Gap**: `PLAN_LIMITS.historyDays` is declared in `api/src/lib/plans.ts` (30 days free / 365 days pro) but no code ever prunes old records. Free users accumulate data indefinitely.

**Suggestion**: Add a Cloudflare Workers cron trigger (via `wrangler.jsonc` `[triggers]`) that runs daily and deletes `package_evolution` rows older than the user's plan limit. The cron handler should join `package_evolution → package → repository → user_repository → subscription` to determine each user's retention window before pruning.

---

### 5. Pagination for the Evolutions Endpoint

**Gap**: `GET /api/v1/repositories/:repoId/packages/:packageId/evolutions` returns all history in a single query and response. For repositories with hundreds of PRs this becomes slow and transfers unnecessary data.

**Suggestion**: Add `limit` (default 50) and `cursor` (opaque, encodes `reportedAt` + `prNumber`) query parameters. Return a `nextCursor` in the response when more pages exist. The frontend's evolution view can load more on demand.

---

### 6. Public Badge / Embed Endpoint

**Gap**: Open-source projects often want to display a live bundle-size badge in their README, but Boris has no public-facing endpoint that doesn't require session auth.

**Suggestion**: Add `GET /api/badge/:repoId/:packageId.svg` (and a JSON variant) that returns a shields.io-compatible SVG showing the latest main-branch size. Repositories can opt into public visibility from the dashboard. This doubles as organic marketing for Boris.

---

### 7. Main-branch Trend Chart

**Gap**: The current chart plots `prSize` per merged PR, which means every data point is a "PR vs main at that time" snapshot—not the actual accumulated main-branch size. This introduces subtle inaccuracies when the base branch itself grows between PRs.

**Suggestion**: When the action runs on a merged PR (i.e., after `prMerged = true`), additionally record the post-merge `main` snapshot as a separate entity (e.g., a `main_snapshot` table or a special `prNumber = 0` convention). The chart can then draw a true main-branch trend line alongside the PR-diff view.

---

### 8. Webhook / Slack / Discord Notifications

**Gap**: There is no push notification when a significant size change is merged. Teams must poll the dashboard.

**Suggestion**: Add a per-repository webhook configuration (URL + secret) in the dashboard. When a PR with a meaningful size delta (configurable threshold) is marked as merged, the API fires a signed HTTP POST to the webhook URL with a JSON summary. Provide preset templates for Slack and Discord. Gate advanced features (multiple webhooks, custom thresholds) behind the Pro plan.

---

### 9. Data Export (CSV / JSON)

**Gap**: There is no way to extract raw evolution data for offline analysis, BI tools, or migration.

**Suggestion**: Add `GET /api/v1/repositories/:repoId/export?format=csv|json` that streams the full evolution history for a repository. Include all columns (PR number, title, branch, commit SHA, export path, file, raw/gzip/brotli sizes, dates). Scope this to Pro users for large exports.

---

### 10. Repository-level Base Branch Configuration

**Gap**: The default base branch (`main`) is configured only as a GitHub Action input. If a team uses `master`, `develop`, or a release branch, they must override it every workflow. The dashboard has no awareness of what the base branch is.

**Suggestion**: Add a `defaultBaseBranch` column to the `repository` table (default `"main"`). Expose an edit field in the repository settings panel. The action should still accept a `base-branch` override input, but fall back to the repository's configured value fetched from the API.

---

### 11. Filtering and Sorting in the Evolutions Table

**Gap**: The evolutions table has no controls to filter by status, sort by size delta, or search by PR title/number. As history accumulates this becomes unwieldy.

**Suggestion**: Add a filter bar above the table with:
- Status filter: All / Open / Merged / Closed
- Sort: Date (default, newest first), Size increase, Size decrease
- Search input: filters PR number or title client-side

These can be implemented entirely in the frontend using the existing data returned from the evolutions endpoint.

---

### 12. Brotli Diff Column in the Evolutions Table

**Gap**: The chart supports a raw/gzip/brotli mode toggle, but the evolutions table's "Change" column is always the gzip diff (falling back to raw). Brotli is tracked in the DB but not surfaced in the table.

**Suggestion**: Add a compression toggle above the table (mirroring the chart toggle) that switches the "Change" column between raw / gzip / brotli. When no brotli data is available for a row, show a `—` placeholder.

---

### 13. Stale Open PR Auto-close

**Gap**: PRs that are abandoned without being merged or explicitly closed stay in "open" state indefinitely, cluttering the evolutions table.

**Suggestion**: As part of the daily cron (see #4), flag any `package_evolution` row with `prState = "open"` and `reportedAt` older than 90 days as `prState = "stale"`. Surface this as a distinct status badge in the table. Users can dismiss stale entries individually or in bulk.

---

### 14. Package-level Labels / Tags

**Gap**: In large monorepos with many packages (e.g., 20+ workspace packages), the packages panel is a flat list with no way to group or label them.

**Suggestion**: Add an optional `label` and `group` text column to the `package` table. Users can set these from the dashboard. The packages panel can group packages by label (e.g., "Core", "Experimental", "Deprecated") and collapse groups.

---

### 15. Action: `records-created` Output Surfacing

**Gap**: The action sets a `records-created` output, but the recommended workflow YAML does not demonstrate how to use it. Most users will not know it exists.

**Suggestion**: Update the example workflow in `docs/github-action.md` and the setup instructions panel to show a step that echoes the output:

```yaml
- name: Report bundle sizes to Boris
  id: boris
  uses: JoviDeCroock/boris-the-bundle-tracker/action@main
  with:
    api-key: ${{ secrets.BORIS_API_KEY }}

- run: echo "Boris recorded ${{ steps.boris.outputs.records-created }} size entries"
```

This also validates that the action ran successfully and sets expectations for first-time users.
