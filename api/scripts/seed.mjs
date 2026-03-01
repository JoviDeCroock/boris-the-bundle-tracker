#!/usr/bin/env node
/**
 * Seed the local D1 database with realistic development data for a given user.
 *
 * Usage:
 *   node scripts/seed.mjs <userId>
 *   node scripts/seed.mjs --userId=<userId>
 *
 * Or via npm:
 *   npm run db:seed -- <userId>
 *
 * The userId must already exist in the `user` table (i.e. the user must have
 * signed up first via the local dev server).
 *
 * The script is idempotent — re-running it for the same userId is safe because
 * every INSERT uses OR IGNORE.
 */

import { createHash, randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// ── Arg parsing ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let userId = null;

for (const arg of args) {
  if (arg.startsWith("--userId=")) {
    userId = arg.slice("--userId=".length);
  } else if (!arg.startsWith("-")) {
    userId = arg;
  }
}

if (!userId) {
  console.error("Error: userId is required.\n");
  console.error("Usage:");
  console.error("  node scripts/seed.mjs <userId>");
  console.error("  node scripts/seed.mjs --userId=<userId>");
  process.exit(1);
}

console.log(`Seeding local D1 database for userId: ${userId}\n`);

// ── Helpers ────────────────────────────────────────────────────────────────────

const uid = () => randomUUID();

/** Unix timestamp in seconds N days in the past. */
const daysAgo = (d) => Math.floor(Date.now() / 1000) - d * 86_400;

/** SHA-256 hex digest of a raw API key string. */
const hashKey = (raw) => createHash("sha256").update(raw).digest("hex");

/** Escape single quotes for SQL string literals. */
const esc = (s) => s.replace(/'/g, "''");

/** Random 40-char hex commit SHA. */
const commitSha = () => randomUUID().replace(/-/g, "").padEnd(40, "0").slice(0, 40);

// ── Entity IDs ─────────────────────────────────────────────────────────────────

const repoPreactId = uid();
const repoMyLibId = uid();

const pkgPreactId = uid();
const pkgCompatId = uid();
const pkgHooksId = uid();
const pkgMyLibId = uid();

const apiKeyPreactId = uid();
const apiKeyMyLibId = uid();

const subscriptionId = uid();

// Raw API key values (shown once to the user in a real flow; we only seed the hash)
const rawKeyPreact = "bbt_" + randomUUID().replace(/-/g, "");
const rawKeyMyLib = "bbt_" + randomUUID().replace(/-/g, "");

// ── SQL builder ────────────────────────────────────────────────────────────────

const statements = [];

// ── Repositories ───────────────────────────────────────────────────────────────

statements.push(`
INSERT OR IGNORE INTO repository (id, owner, name, created_at, updated_at) VALUES
  ('${repoPreactId}', 'preact', 'preact', ${daysAgo(90)}, ${daysAgo(5)}),
  ('${repoMyLibId}', '${esc(userId.slice(0, 20))}', 'my-bundle-lib', ${daysAgo(30)}, ${daysAgo(1)});
`);

// ── User ↔ Repository links ────────────────────────────────────────────────────

statements.push(`
INSERT OR IGNORE INTO user_repository (user_id, repository_id, created_at) VALUES
  ('${esc(userId)}', '${repoPreactId}', ${daysAgo(85)}),
  ('${esc(userId)}', '${repoMyLibId}', ${daysAgo(25)});
`);

// ── API Keys ───────────────────────────────────────────────────────────────────

statements.push(`
INSERT OR IGNORE INTO api_key (id, repository_id, name, key_hash, key_prefix, created_at) VALUES
  ('${apiKeyPreactId}', '${repoPreactId}', 'GitHub Actions', '${hashKey(rawKeyPreact)}', '${rawKeyPreact.slice(0, 12)}', ${daysAgo(85)}),
  ('${apiKeyMyLibId}', '${repoMyLibId}',  'GitHub Actions', '${hashKey(rawKeyMyLib)}',  '${rawKeyMyLib.slice(0, 12)}', ${daysAgo(25)});
`);

// ── Packages ───────────────────────────────────────────────────────────────────

statements.push(`
INSERT OR IGNORE INTO package (id, repository_id, name, path, created_at, updated_at) VALUES
  ('${pkgPreactId}', '${repoPreactId}', 'preact',       '.',               ${daysAgo(85)}, ${daysAgo(5)}),
  ('${pkgCompatId}', '${repoPreactId}', 'preact/compat', 'packages/compat', ${daysAgo(85)}, ${daysAgo(5)}),
  ('${pkgHooksId}',  '${repoPreactId}', 'preact/hooks',  'packages/hooks',  ${daysAgo(80)}, ${daysAgo(10)}),
  ('${pkgMyLibId}',  '${repoMyLibId}',  'my-bundle-lib', '.',               ${daysAgo(25)}, ${daysAgo(1)});
`);

// ── Package Evolution ──────────────────────────────────────────────────────────
//
// Generates rows for the package_evolution table simulating a realistic history
// of PRs. Each entry records bundle sizes before (main_size) and after (pr_size)
// the PR's changes. For merged PRs, the cumulative base size advances.
//
// Column order in INSERT:
//   id, package_id, pr_number, pr_title, branch, commit_sha,
//   pr_merged, pr_state, export_path, file_name,
//   main_size, pr_size, gzip_main_size, gzip_pr_size,
//   brotli_main_size, brotli_pr_size, reported_at

/**
 * Build evolution rows for a package.
 *
 * @param {string} packageId
 * @param {string} exportPath  e.g. "." or "./client"
 * @param {string} fileName    e.g. "dist/index.module.js"
 * @param {number} baseSize    Starting raw byte size
 * @param {number} gzipRatio   Fraction of raw size after gzip  (e.g. 0.35)
 * @param {number} brotliRatio Fraction of raw size after brotli (null = omit)
 * @param {Array}  prs         PR descriptors
 */
function buildEvolution(packageId, exportPath, fileName, baseSize, gzipRatio, brotliRatio, prs) {
  const rows = [];
  let currentBase = baseSize;

  for (const pr of prs) {
    const prSize = currentBase + pr.sizeDelta;
    const gzipMain = Math.round(currentBase * gzipRatio);
    const gzipPr = Math.round(prSize * gzipRatio);
    const brotliMain = brotliRatio != null ? Math.round(currentBase * brotliRatio) : "NULL";
    const brotliPr = brotliRatio != null ? Math.round(prSize * brotliRatio) : "NULL";

    rows.push(
      `('${uid()}', '${packageId}', ${pr.prNumber}, '${esc(pr.prTitle)}', ` +
        `'${pr.branch}', '${commitSha()}', ${pr.merged ? 1 : 0}, '${pr.state}', ` +
        `'${exportPath}', '${fileName}', ` +
        `${currentBase}, ${prSize}, ${gzipMain}, ${gzipPr}, ${brotliMain}, ${brotliPr}, ` +
        `${daysAgo(pr.daysBack)})`
    );

    if (pr.merged) {
      currentBase = prSize;
    }
  }

  return rows;
}

// ── preact (main package) ──────────────────────────────────────────────────────

const preactRows = buildEvolution(
  pkgPreactId, ".", "dist/preact.module.js",
  11_200, 0.35, 0.30,
  [
    { prNumber: 4100, prTitle: "fix: improve event delegation performance",  branch: "fix/event-delegation",          daysBack: 88, sizeDelta: -150, merged: true,  state: "closed" },
    { prNumber: 4105, prTitle: "feat: add useId hook",                        branch: "feat/use-id",                   daysBack: 82, sizeDelta:  320, merged: true,  state: "closed" },
    { prNumber: 4110, prTitle: "refactor: simplify diff algorithm",           branch: "refactor/diff-simplify",        daysBack: 75, sizeDelta: -280, merged: true,  state: "closed" },
    { prNumber: 4115, prTitle: "fix: correct error boundary behavior",        branch: "fix/error-boundary",            daysBack: 68, sizeDelta:   95, merged: true,  state: "closed" },
    { prNumber: 4120, prTitle: "perf: optimize component reconciliation",     branch: "perf/reconciler",               daysBack: 60, sizeDelta: -420, merged: true,  state: "closed" },
    { prNumber: 4125, prTitle: "feat: experimental concurrent mode hints",    branch: "feat/concurrent-hints",         daysBack: 52, sizeDelta:  800, merged: true,  state: "closed" },
    { prNumber: 4130, prTitle: "fix: memory leak in unmount cleanup",         branch: "fix/unmount-cleanup",           daysBack: 44, sizeDelta:  -60, merged: true,  state: "closed" },
    { prNumber: 4135, prTitle: "chore: update internal utilities",            branch: "chore/internal-utils",          daysBack: 36, sizeDelta:  120, merged: true,  state: "closed" },
    { prNumber: 4140, prTitle: "feat: improve createPortal API",              branch: "feat/portal-api",               daysBack: 28, sizeDelta:  200, merged: true,  state: "closed" },
    { prNumber: 4145, prTitle: "fix: hydration mismatch warnings",            branch: "fix/hydration-warnings",        daysBack: 20, sizeDelta:   45, merged: true,  state: "closed" },
    { prNumber: 4148, prTitle: "refactor: tree-shake internal helpers",       branch: "refactor/tree-shake-internals", daysBack: 12, sizeDelta: -500, merged: true,  state: "closed" },
    { prNumber: 4152, prTitle: "feat: add useSyncExternalStore",              branch: "feat/use-sync-external-store",  daysBack:  5, sizeDelta:  350, merged: false, state: "open"   },
  ]
);

// ── preact/compat ──────────────────────────────────────────────────────────────

const compatRows = buildEvolution(
  pkgCompatId, ".", "dist/compat.module.js",
  19_500, 0.38, 0.32,
  [
    { prNumber: 4101, prTitle: "fix: align React.createElement behavior",         branch: "fix/create-element-compat",   daysBack: 86, sizeDelta:   80, merged: true,  state: "closed" },
    { prNumber: 4108, prTitle: "feat: support React 18 startTransition",          branch: "feat/start-transition",       daysBack: 79, sizeDelta:  420, merged: true,  state: "closed" },
    { prNumber: 4117, prTitle: "fix: forwardRef edge cases",                       branch: "fix/forward-ref",             daysBack: 65, sizeDelta:  -30, merged: true,  state: "closed" },
    { prNumber: 4122, prTitle: "perf: reduce compat wrapper overhead",            branch: "perf/compat-overhead",        daysBack: 58, sizeDelta: -650, merged: true,  state: "closed" },
    { prNumber: 4138, prTitle: "feat: add React.useInsertionEffect shim",         branch: "feat/use-insertion-effect",   daysBack: 32, sizeDelta:  180, merged: true,  state: "closed" },
    { prNumber: 4150, prTitle: "chore: remove deprecated React 16 polyfills",     branch: "chore/rm-react16-polyfills",  daysBack: 14, sizeDelta: -920, merged: true,  state: "closed" },
    { prNumber: 4153, prTitle: "feat: support React 19 use() hook",               branch: "feat/react19-use-hook",       daysBack:  3, sizeDelta:  260, merged: false, state: "open"   },
  ]
);

// ── preact/hooks ───────────────────────────────────────────────────────────────

const hooksRows = buildEvolution(
  pkgHooksId, ".", "dist/hooks.module.js",
  3_200, 0.40, null,
  [
    { prNumber: 4103, prTitle: "feat: add useDebugValue support",          branch: "feat/use-debug-value",  daysBack: 83, sizeDelta:  140, merged: true,  state: "closed" },
    { prNumber: 4116, prTitle: "fix: useEffect dependency comparison",     branch: "fix/effect-deps",       daysBack: 67, sizeDelta:   20, merged: true,  state: "closed" },
    { prNumber: 4126, prTitle: "perf: memoize hook dispatch",              branch: "perf/hook-dispatch",    daysBack: 50, sizeDelta:  -90, merged: true,  state: "closed" },
    { prNumber: 4139, prTitle: "feat: useDeferredValue implementation",    branch: "feat/deferred-value",   daysBack: 30, sizeDelta:  210, merged: true,  state: "closed" },
    { prNumber: 4149, prTitle: "fix: batch hook updates in async context", branch: "fix/async-batch",       daysBack: 16, sizeDelta:   55, merged: true,  state: "closed" },
    { prNumber: 4154, prTitle: "feat: useOptimistic hook",                 branch: "feat/use-optimistic",   daysBack:  2, sizeDelta:  175, merged: false, state: "open"   },
  ]
);

// ── my-bundle-lib ──────────────────────────────────────────────────────────────

const myLibRows = buildEvolution(
  pkgMyLibId, ".", "dist/index.js",
  4_500, 0.38, null,
  [
    { prNumber: 1, prTitle: "feat: initial implementation",       branch: "feat/initial",           daysBack: 24, sizeDelta:    0, merged: true,  state: "closed" },
    { prNumber: 2, prTitle: "feat: add tree-shaking support",     branch: "feat/tree-shaking",      daysBack: 20, sizeDelta: -800, merged: true,  state: "closed" },
    { prNumber: 3, prTitle: "fix: correct named export paths",    branch: "fix/export-paths",       daysBack: 15, sizeDelta: -100, merged: true,  state: "closed" },
    { prNumber: 4, prTitle: "feat: add TypeScript declarations",  branch: "feat/typescript-dts",    daysBack: 10, sizeDelta:  200, merged: true,  state: "closed" },
    { prNumber: 5, prTitle: "chore: optimize bundle output",      branch: "chore/bundle-optimize",  daysBack:  3, sizeDelta: -300, merged: false, state: "open"   },
  ]
);

// ── INSERT package_evolution ───────────────────────────────────────────────────

const allEvolutionRows = [...preactRows, ...compatRows, ...hooksRows, ...myLibRows];

statements.push(`
INSERT OR IGNORE INTO package_evolution
  (id, package_id, pr_number, pr_title, branch, commit_sha,
   pr_merged, pr_state, export_path, file_name,
   main_size, pr_size, gzip_main_size, gzip_pr_size,
   brotli_main_size, brotli_pr_size, reported_at)
VALUES
  ${allEvolutionRows.join(",\n  ")};
`);

// ── Subscription ───────────────────────────────────────────────────────────────

statements.push(`
INSERT OR IGNORE INTO subscription (id, user_id, plan, status, created_at, updated_at) VALUES
  ('${subscriptionId}', '${esc(userId)}', 'free', 'active', ${daysAgo(90)}, ${daysAgo(0)});
`);

// ── Execute against local D1 ───────────────────────────────────────────────────

const sql = statements.join("\n");
const tmpFile = join(tmpdir(), `boris-seed-${Date.now()}.sql`);
// Resolve the api/ directory (parent of scripts/)
const apiDir = fileURLToPath(new URL("..", import.meta.url));

try {
  writeFileSync(tmpFile, sql, "utf8");

  console.log("Running: wrangler d1 execute boris-db --local --file=<sql>\n");
  execSync(`wrangler d1 execute boris-db --local --file="${tmpFile}"`, {
    stdio: "inherit",
    cwd: apiDir,
  });

  console.log("\nSeed data inserted successfully!");
  console.log("\nSummary:");
  console.log("  Repositories : 2  (preact/preact, <you>/my-bundle-lib)");
  console.log("  Packages     : 4  (preact, preact/compat, preact/hooks, my-bundle-lib)");
  console.log(`  Evolution    : ${allEvolutionRows.length} records across ${allEvolutionRows.length} PR snapshots`);
  console.log("  API keys     : 2  (one per repository)");
  console.log("  Subscription : 1  (free plan)");
} finally {
  try {
    unlinkSync(tmpFile);
  } catch {
    // ignore cleanup errors
  }
}
