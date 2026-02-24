import { useEffect, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso";
import { useModel } from "@preact/signals";
import { AuthModel } from "../../models/auth";
import { RepositoriesModel } from "../../models/repositories";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { Repository, PackageEvolution } from "../../lib/api";

// ── Utility helpers ───────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function diffBadge(mainSize: number, prSize: number) {
  const diff = prSize - mainSize;
  const pct = mainSize === 0 ? 0 : (diff / mainSize) * 100;
  const label = diff >= 0 ? `+${formatBytes(diff)}` : `-${formatBytes(Math.abs(diff))}`;
  const pctLabel = `(${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`;

  if (diff === 0) {
    return <span class="text-neutral-400 text-xs">no change</span>;
  }
  if (diff > 0) {
    return (
      <span class="text-red-400 text-xs font-medium">
        {label} {pctLabel}
      </span>
    );
  }
  return (
    <span class="text-green-400 text-xs font-medium">
      {label} {pctLabel}
    </span>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ApiKeysPanel({ repoId }: { repoId: string }) {
  const repos = useModel(RepositoriesModel);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    repos.fetchApiKeys(repoId);
  }, [repoId]);

  async function handleCreate(e: Event) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await repos.addApiKey(repoId, newKeyName.trim());
      setNewKeyName("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section class="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      <h2 class="text-base font-semibold text-white mb-1">API Keys</h2>
      <p class="text-xs text-neutral-500 mb-4">
        Use these keys to authenticate the GitHub Action. The full key is shown only once.
      </p>

      {/* One-time key reveal */}
      {repos.newKeyValue.value && (
        <div class="mb-4 p-3 bg-green-950 border border-green-800 rounded-lg">
          <p class="text-xs text-green-400 font-medium mb-1">
            Copy this key now — it will not be shown again.
          </p>
          <code class="block text-xs text-green-300 break-all font-mono">
            {repos.newKeyValue.value}
          </code>
          <button
            class="mt-2 text-xs text-green-400 underline"
            onClick={() => (repos.newKeyValue.value = null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} class="flex gap-2 mb-4">
        <Input
          type="text"
          placeholder="Key name, e.g. CI"
          value={newKeyName}
          onInput={(e) => setNewKeyName((e.target as HTMLInputElement).value)}
          class="flex-1"
        />
        <Button type="submit" disabled={!newKeyName.trim() || creating}>
          {creating ? "Creating…" : "Create key"}
        </Button>
      </form>
      {createError && <p class="text-xs text-red-400 mb-3">{createError}</p>}

      {/* Key list */}
      {repos.apiKeysLoading.value ? (
        <p class="text-sm text-neutral-500 py-4 text-center">Loading…</p>
      ) : repos.apiKeys.value.length === 0 ? (
        <p class="text-sm text-neutral-500 py-4 text-center">No API keys yet.</p>
      ) : (
        <ul class="divide-y divide-neutral-800">
          {repos.apiKeys.value.map((key) => (
            <li key={key.id} class="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p class="text-sm text-white font-medium">{key.name}</p>
                <p class="text-xs text-neutral-500 font-mono mt-0.5">{key.keyPrefix}</p>
                {key.lastUsedAt && (
                  <p class="text-xs text-neutral-600 mt-0.5">
                    Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Button
                variant="danger-icon"
                onClick={async () => {
                  if (confirm(`Delete key "${key.name}"?`)) {
                    await repos.removeApiKey(repoId, key.id);
                  }
                }}
                title="Delete key"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width={2}
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EvolutionsTable({ evolutions }: { evolutions: PackageEvolution[] }) {
  // Group by PR and keep only the latest measurement for each file in that PR.
  const byPr = new Map<number, Map<string, PackageEvolution>>();
  for (const ev of evolutions) {
    const key = `${ev.exportPath}::${ev.fileName}`;
    const files = byPr.get(ev.prNumber) ?? new Map<string, PackageEvolution>();
    const existing = files.get(key);
    if (!existing || new Date(ev.reportedAt).getTime() > new Date(existing.reportedAt).getTime()) {
      files.set(key, ev);
    }
    byPr.set(ev.prNumber, files);
  }

  if (byPr.size === 0) {
    return (
      <p class="text-sm text-neutral-500 text-center py-6">
        No data yet. Run the GitHub Action on a pull request to see results.
      </p>
    );
  }

  return (
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-neutral-500 text-xs border-b border-neutral-800">
            <th class="pb-2 pr-4 font-medium">PR</th>
            <th class="pb-2 pr-4 font-medium">Status</th>
            <th class="pb-2 pr-4 font-medium">File</th>
            <th class="pb-2 pr-4 font-medium">Main</th>
            <th class="pb-2 pr-4 font-medium">PR</th>
            <th class="pb-2 font-medium">Change</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-800/50">
          {Array.from(byPr.entries()).map(([prNumber, fileMap]) => {
            const entries = Array.from(fileMap.values());
            const latestEntry = entries.reduce((latest, entry) =>
              new Date(entry.reportedAt).getTime() > new Date(latest.reportedAt).getTime()
                ? entry
                : latest,
            );

            return entries.map((ev, i) => (
              <tr key={ev.id} class="text-neutral-300">
                {i === 0 && (
                  <>
                    <td class="py-2 pr-4 align-top" rowSpan={entries.length}>
                      <a
                        href={`https://github.com/${ev.branch}`}
                        class="text-violet-400 hover:text-violet-300 font-medium"
                      >
                        #{prNumber}
                      </a>
                      {ev.prTitle && (
                        <p class="text-xs text-neutral-500 mt-0.5 max-w-[12rem] truncate">
                          {ev.prTitle}
                        </p>
                      )}
                    </td>
                    <td class="py-2 pr-4 align-top" rowSpan={entries.length}>
                      {latestEntry.prMerged ? (
                        <span class="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          Merged
                        </span>
                      ) : latestEntry.prState === "closed" ? (
                        <span class="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                          Closed
                        </span>
                      ) : (
                        <span class="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          Open
                        </span>
                      )}
                    </td>
                  </>
                )}
                <td class="py-2 pr-4 font-mono text-xs text-neutral-400">{ev.fileName}</td>
                <td class="py-2 pr-4 font-mono text-xs">{formatBytes(ev.mainSize)}</td>
                <td class="py-2 pr-4 font-mono text-xs">{formatBytes(ev.prSize)}</td>
                <td class="py-2">{diffBadge(ev.mainSize, ev.prSize)}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}

function PackagesPanel({ repoId }: { repoId: string }) {
  const repos = useModel(RepositoriesModel);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    repos.fetchPackages(repoId);
  }, [repoId]);

  async function handleExpand(packageId: string) {
    if (expandedId === packageId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(packageId);
    await repos.fetchEvolutions(repoId, packageId);
  }

  return (
    <section class="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      <h2 class="text-base font-semibold text-white mb-1">Packages</h2>
      <p class="text-xs text-neutral-500 mb-4">
        Packages are registered automatically when the GitHub Action reports bundle sizes.
      </p>

      {repos.packagesLoading.value ? (
        <p class="text-sm text-neutral-500 text-center py-6">Loading…</p>
      ) : repos.packages.value.length === 0 ? (
        <p class="text-sm text-neutral-500 text-center py-6">
          No packages tracked yet. Set up the GitHub Action to start collecting data.
        </p>
      ) : (
        <ul class="divide-y divide-neutral-800">
          {repos.packages.value.map((pkg) => (
            <li key={pkg.id} class="py-3 first:pt-0 last:pb-0">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-white">{pkg.name}</p>
                  {pkg.path && <p class="text-xs text-neutral-500 mt-0.5">{pkg.path}</p>}
                </div>
                <div class="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleExpand(pkg.id)}>
                    {expandedId === pkg.id ? "Hide" : "Show history"}
                  </Button>
                  <Button
                    variant="danger-icon"
                    onClick={async () => {
                      if (confirm(`Delete package "${pkg.name}" and all its data?`)) {
                        await repos.removePackage(repoId, pkg.id);
                        if (expandedId === pkg.id) setExpandedId(null);
                      }
                    }}
                    title="Delete package"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width={2}
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </Button>
                </div>
              </div>

              {expandedId === pkg.id && (
                <div class="mt-3">
                  {repos.evolutionsLoading.value ? (
                    <p class="text-xs text-neutral-500">Loading history…</p>
                  ) : repos.evolutionsError.value ? (
                    <p class="text-xs text-red-400">{repos.evolutionsError.value}</p>
                  ) : (
                    <EvolutionsTable evolutions={repos.evolutions.value} />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function RepositoryPage() {
  const { route } = useLocation();
  const { params } = useRoute();
  const auth = useModel(AuthModel);
  const repos = useModel(RepositoriesModel);

  const repoId = params.id as string;

  // The repository record — look it up from the cached list or fall back to a placeholder.
  const repository: Repository | undefined = repos.repositories.value.find((r) => r.id === repoId);

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
      } else if (repos.repositories.value.length === 0) {
        // Ensure the repository list is populated (e.g. direct navigation).
        repos.fetchRepositories();
      }
    });
  }, []);

  if (auth.loading.value || repos.reposLoading.value) {
    return (
      <div class="min-h-screen bg-neutral-950 pt-16 flex items-center justify-center">
        <p class="text-neutral-400 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-neutral-950 pt-16">
      <div class="max-w-4xl mx-auto px-6 py-12 space-y-6">
        {/* Breadcrumb */}
        <div class="flex items-center gap-2 text-sm text-neutral-400">
          <button onClick={() => route("/dashboard")} class="hover:text-white transition-colors">
            Repositories
          </button>
          <span>/</span>
          <span class="text-white">
            {repository ? `${repository.owner}/${repository.name}` : repoId}
          </span>
        </div>

        <PackagesPanel repoId={repoId} />
        <ApiKeysPanel repoId={repoId} />

        {/* Setup instructions */}
        <section class="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 class="text-base font-semibold text-white mb-2">GitHub Action setup</h2>
          <p class="text-xs text-neutral-400 mb-3">
            Add the following to your repository's workflow file. Store the API key as a GitHub
            secret named <code class="bg-neutral-800 px-1 rounded">BORIS_API_KEY</code>.
          </p>
          <pre class="bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-xs text-neutral-300 overflow-x-auto font-mono leading-relaxed">{`name: Boris Bundle Tracker
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - name: Build PR branch
        run: npm run build

      - name: Collect sizes & report to Boris
        uses: JoviDeCroock/boris-the-bundle-tracker/action@main
        with:
          api-key: \${{ secrets.BORIS_API_KEY }}
          repository: ${repository ? `${repository.owner}/${repository.name}` : "owner/repo"}`}</pre>
          <p class="text-xs text-neutral-500 mt-3">
            See{" "}
            <a
              href="https://github.com/JoviDeCroock/boris-the-bundle-tracker/blob/main/docs/github-action.md"
              class="text-violet-400 hover:text-violet-300"
            >
              docs/github-action.md
            </a>{" "}
            for the full reference.
          </p>
        </section>
      </div>
    </div>
  );
}
