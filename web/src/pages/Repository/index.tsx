import { useEffect } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso";
import { useModel, useSignal } from "@preact/signals";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthModel } from "../../models/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { Repository, PackageEvolution } from "../../lib/api";
import {
  createApiKey,
  deleteApiKey,
  deletePackage,
  getPackageEvolutions,
  listApiKeys,
  listPackages,
  listRepositories,
  updateEvolution,
} from "../../lib/api";
import { BundleSizeChart } from "../../components/BundleSizeChart";
import actionDefinitionFile from "../../../action/action.yml?raw";
import actionRuntimeFile from "../../../action/index.js?raw";

// ── Utility helpers ───────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function diffBadge(mainSize: number, prSize: number) {
  const diff = prSize - mainSize;
  const pct = mainSize === 0 ? 0 : (diff / mainSize) * 100;
  const label = diff >= 0 ? `+${formatBytes(diff)}` : `−${formatBytes(Math.abs(diff))}`;
  const pctLabel = `(${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`;

  if (diff === 0) {
    return <span class="font-mono text-xs text-neutral-600">no change</span>;
  }
  if (diff > 0) {
    return (
      <span class="font-mono text-xs text-red-400 tabular-nums">
        {label} {pctLabel}
      </span>
    );
  }
  return (
    <span class="font-mono text-xs text-emerald-400 tabular-nums">
      {label} {pctLabel}
    </span>
  );
}

function SizeCell({
  raw,
  gzip,
  brotli,
}: {
  raw: number;
  gzip: number | null;
  brotli: number | null;
}) {
  return (
    <div class="font-mono text-xs space-y-0.5">
      <div class="text-neutral-300">{formatBytes(raw)}</div>
      {gzip != null && (
        <div class="text-neutral-500">
          {formatBytes(gzip)} <span class="text-neutral-600">gz</span>
        </div>
      )}
      {brotli != null && (
        <div class="text-neutral-500">
          {formatBytes(brotli)} <span class="text-neutral-600">br</span>
        </div>
      )}
    </div>
  );
}

const ACTION_INSTALL_FILES = [
  {
    id: "action-yml",
    name: "action.yml",
    targetPath: ".github/actions/boris-bundle-tracker/action.yml",
    content: actionDefinitionFile,
    languageClass: "language-yaml",
  },
  {
    id: "index-js",
    name: "index.js",
    targetPath: ".github/actions/boris-bundle-tracker/index.js",
    content: actionRuntimeFile,
    languageClass: "language-javascript",
  },
] as const;

function ActionFilesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const activeFileId = useSignal<(typeof ACTION_INSTALL_FILES)[number]["id"]>(
    ACTION_INSTALL_FILES[0].id,
  );
  const copiedLabel = useSignal<string | null>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const activeFile =
    ACTION_INSTALL_FILES.find((file) => file.id === activeFileId.value) ?? ACTION_INSTALL_FILES[0];

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      copiedLabel.value = label;
      window.setTimeout(() => {
        if (copiedLabel.value === label) copiedLabel.value = null;
      }, 1500);
    } catch {
      copiedLabel.value = `Failed to copy ${label}`;
    }
  }

  return (
    <div
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-files-modal-title"
    >
      <div
        class="w-full max-w-5xl rounded-xl border border-neutral-800 overflow-hidden"
        style="background: #111113;"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="px-5 py-4 border-b border-neutral-800/60 flex items-start justify-between gap-4">
          <div>
            <h2 id="action-files-modal-title" class="text-sm font-semibold text-white">
              Add Boris action files to your repository
            </h2>
            <p class="text-xs text-neutral-600 mt-1">
              Create{" "}
              <code class="font-mono text-neutral-500">.github/actions/boris-bundle-tracker/</code>{" "}
              and copy these files in.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div class="px-5 pt-4">
          <div
            class="rounded-lg border border-neutral-800/60 p-3 text-xs text-neutral-500 font-mono"
            style="background: rgba(0,0,0,0.2);"
          >
            Then use{" "}
            <code class="text-neutral-300">uses: ./.github/actions/boris-bundle-tracker</code> in
            your workflow.
          </div>
        </div>

        <div class="p-5 space-y-4">
          <div class="flex flex-wrap gap-2">
            {ACTION_INSTALL_FILES.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => (activeFileId.value = file.id)}
                class={`px-3 py-1.5 rounded-md font-mono text-xs border transition-colors ${
                  activeFile.id === file.id
                    ? "border-orange-500/40 bg-orange-500/10 text-orange-400"
                    : "border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700"
                }`}
              >
                {file.name}
              </button>
            ))}
          </div>

          <div class="rounded-lg border border-neutral-800/60 overflow-hidden">
            <div
              class="px-4 py-3 border-b border-neutral-800/60 flex flex-wrap items-center justify-between gap-2"
              style="background: rgba(0,0,0,0.2);"
            >
              <code class="font-mono text-xs text-neutral-400 break-all">
                {activeFile.targetPath}
              </code>
              <div class="flex items-center gap-2">
                {copiedLabel.value && (
                  <span class="font-mono text-[10px] text-emerald-500">{copiedLabel.value}</span>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copyText(activeFile.targetPath, "path")}
                >
                  Copy path
                </Button>
                <Button size="sm" onClick={() => copyText(activeFile.content, activeFile.name)}>
                  Copy file
                </Button>
              </div>
            </div>
            <pre
              class={`max-h-[55vh] overflow-auto p-4 text-xs leading-relaxed font-mono text-neutral-300 ${activeFile.languageClass}`}
              style="background: rgba(0,0,0,0.35);"
            >
              {activeFile.content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ApiKeysPanel({ repoId }: { repoId: string }) {
  const queryClient = useQueryClient();
  const newKeyName= useSignal("");
  const createError = useSignal<string | null>(null);
  const newKeyValue = useSignal<string | null>(null);
  const copyStatus = useSignal<string | null>(null);

  const apiKeysQuery = useQuery({
    queryKey: ["repositories", repoId, "api-keys"],
    queryFn: () => listApiKeys(repoId),
    enabled: Boolean(repoId),
  });

  const createApiKeyMutation = useMutation({
    mutationFn: (name: string) => createApiKey(repoId, name),
    onSuccess: (key) => {
      newKeyValue.value = key.key ?? null;
      queryClient.invalidateQueries({ queryKey: ["repositories", repoId, "api-keys"] });
    },
  });

  const removeApiKeyMutation = useMutation({
    mutationFn: (keyId: string) => deleteApiKey(repoId, keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories", repoId, "api-keys"] });
    },
  });

  async function handleCreate(e: Event) {
    e.preventDefault();
    if (!newKeyName.value.trim()) return;
    createError.value = null;
    try {
      await createApiKeyMutation.mutateAsync(newKeyName.value.trim());
      newKeyName.value = "";
    } catch (err) {
      createError.value = err instanceof Error ? err.message : "Failed to create key";
    }
  }

  async function handleCopyNewKey() {
    if (!newKeyValue.value) return;
    try {
      await navigator.clipboard.writeText(newKeyValue.value);
      copyStatus.value = "Copied";
      window.setTimeout(() => {
        if (copyStatus.value === "Copied") copyStatus.value = null;
      }, 1500);
    } catch {
      copyStatus.value = "Copy failed";
    }
  }

  return (
    <section
      class="rounded-xl border border-neutral-800 overflow-hidden"
      style="background: #111113;"
    >
      <div class="px-5 py-4 border-b border-neutral-800/60">
        <h2 class="text-xs font-mono text-neutral-500 uppercase tracking-wider">API Keys</h2>
        <p class="text-xs text-neutral-700 mt-1">
          Used to authenticate the GitHub Action. Full key shown once at creation.
        </p>
      </div>

      <div class="p-5">
        {/* One-time key reveal */}
        {newKeyValue.value && (
          <div
            class="mb-5 p-4 rounded-lg border"
            style="background: rgba(34,197,94,0.05); border-color: rgba(34,197,94,0.2);"
          >
            <p class="font-mono text-xs text-emerald-400 mb-2">
              Copy this key now — it will not be shown again.
            </p>
            <code class="block text-xs text-emerald-300 break-all font-mono leading-relaxed">
              {newKeyValue.value}
            </code>
            <div class="mt-3 flex items-center gap-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCopyNewKey}
                class="border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
              >
                Copy API key
              </Button>
              {copyStatus.value && (
                <span class="font-mono text-[11px] text-emerald-400">{copyStatus.value}</span>
              )}
              <button
                class="font-mono text-xs text-emerald-600 hover:text-emerald-400 transition-colors"
                onClick={() => (newKeyValue.value = null)}
              >
                Dismiss ×
              </button>
            </div>
          </div>
        )}

        {/* Create form */}
        <form onSubmit={handleCreate} class="flex gap-2 mb-4">
          <Input
            type="text"
            placeholder="Key name, e.g. CI"
            value={newKeyName.value}
            onInput={(e) => (newKeyName.value = (e.target as HTMLInputElement).value)}
            class="flex-1"
          />
          <Button type="submit" size="sm" disabled={!newKeyName.value.trim() || createApiKeyMutation.isPending}>
            {createApiKeyMutation.isPending ? "Creating…" : "Create"}
          </Button>
        </form>
        {createError.value && <p class="font-mono text-xs text-red-400 mb-4">{createError.value}</p>}

        {/* Key list */}
        {apiKeysQuery.isLoading ? (
          <p class="font-mono text-xs text-neutral-600 py-4 text-center">Loading…</p>
        ) : (apiKeysQuery.data ?? []).length === 0 ? (
          <p class="font-mono text-xs text-neutral-700 py-4 text-center">No API keys yet.</p>
        ) : (
          <ul class="divide-y divide-neutral-800/60">
            {(apiKeysQuery.data ?? []).map((key) => (
              <li key={key.id} class="flex items-center justify-between py-3 first:pt-0">
                <div class="min-w-0">
                  <p class="text-sm text-white font-medium">{key.name}</p>
                  <p class="font-mono text-xs text-neutral-600 mt-0.5">{key.keyPrefix}…</p>
                  {key.lastUsedAt && (
                    <p class="font-mono text-xs text-neutral-700 mt-0.5">
                      last used {new Date(key.lastUsedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button
                  variant="danger-icon"
                  onClick={async () => {
                    if (confirm(`Delete key "${key.name}"?`)) {
                      await removeApiKeyMutation.mutateAsync(key.id);
                    }
                  }}
                  title="Delete key"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width={1.5}
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
      </div>
    </section>
  );
}

function EvolutionsTable({
  evolutions,
  repository,
  repoId,
  packageId,
}: {
  evolutions: PackageEvolution[];
  repository: Repository | undefined;
  repoId: string;
  packageId: string;
}) {
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

  const queryClient = useQueryClient();
  const updatingPr = useSignal<number | null>(null);
  const markMergedMutation = useMutation({
    mutationFn: (prNumber: number) => updateEvolution(repoId, packageId, prNumber, { prMerged: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["repositories", repoId, "packages", packageId, "evolutions"],
      });
    },
  });

  async function handleMarkMerged(prNumber: number) {
    updatingPr.value = prNumber;
    try {
      await markMergedMutation.mutateAsync(prNumber);
    } catch (e) {
      console.error(e);
      alert("Failed to mark as merged");
    } finally {
      updatingPr.value = null;
    }
  }

  if (byPr.size === 0) {
    return (
      <p class="font-mono text-xs text-neutral-700 text-center py-5">
        No data yet. Run the GitHub Action on a pull request to see results.
      </p>
    );
  }

  return (
    <div class="overflow-x-auto -mx-5 px-5">
      <table class="w-full text-sm min-w-[560px]">
        <thead>
          <tr class="text-left border-b border-neutral-800/60">
            <th class="pb-2 pr-4 font-mono text-[10px] uppercase tracking-widest text-neutral-600 font-normal">
              PR
            </th>
            <th class="pb-2 pr-4 font-mono text-[10px] uppercase tracking-widest text-neutral-600 font-normal">
              Status
            </th>
            <th class="pb-2 pr-4 font-mono text-[10px] uppercase tracking-widest text-neutral-600 font-normal">
              File
            </th>
            <th class="pb-2 pr-4 font-mono text-[10px] uppercase tracking-widest text-neutral-600 font-normal text-right">
              Main
            </th>
            <th class="pb-2 pr-4 font-mono text-[10px] uppercase tracking-widest text-neutral-600 font-normal text-right">
              PR
            </th>
            <th class="pb-2 font-mono text-[10px] uppercase tracking-widest text-neutral-600 font-normal text-right">
              Change (gz)
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-800/40">
          {Array.from(byPr.entries()).map(([prNumber, fileMap]) => {
            const entries = Array.from(fileMap.values());
            const latestEntry = entries.reduce((latest, entry) =>
              new Date(entry.reportedAt).getTime() > new Date(latest.reportedAt).getTime()
                ? entry
                : latest,
            );
            const prUrl = repository
              ? `https://github.com/${repository.owner}/${repository.name}/pull/${prNumber}`
              : `#${prNumber}`;

            return entries.map((ev, i) => (
              <tr key={ev.id}>
                {i === 0 && (
                  <>
                    <td class="py-2.5 pr-4 align-top" rowSpan={entries.length}>
                      <a
                        href={prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="font-mono text-xs text-orange-500 hover:text-orange-400 transition-colors"
                      >
                        #{prNumber}
                      </a>
                      {ev.prTitle && (
                        <p class="text-xs text-neutral-600 mt-0.5 max-w-[10rem] truncate">
                          {ev.prTitle}
                        </p>
                      )}
                    </td>
                    <td class="py-2.5 pr-4 align-top" rowSpan={entries.length}>
                      <div class="flex items-center gap-2">
                        {latestEntry.prMerged ? (
                          <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                            merged
                          </span>
                        ) : latestEntry.prState === "closed" ? (
                          <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500">
                            closed
                          </span>
                        ) : (
                          <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                            open
                          </span>
                        )}
                        {!latestEntry.prMerged && latestEntry.prState !== "closed" && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            class="h-6 px-2.5 py-0 text-[10px] font-mono border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
                            onClick={() => handleMarkMerged(prNumber)}
                            disabled={updatingPr.value === prNumber}
                          >
                            {updatingPr.value === prNumber ? "Marking…" : "Mark PR as merged"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </>
                )}
                <td class="py-2.5 pr-4 font-mono text-xs text-neutral-500">{ev.fileName}</td>
                <td class="py-2.5 pr-4 align-top">
                  <SizeCell raw={ev.mainSize} gzip={ev.gzipMainSize} brotli={ev.brotliMainSize} />
                </td>
                <td class="py-2.5 pr-4 align-top">
                  <SizeCell raw={ev.prSize} gzip={ev.gzipPrSize} brotli={ev.brotliPrSize} />
                </td>
                <td class="py-2.5 text-right">
                  {diffBadge(ev.gzipMainSize ?? ev.mainSize, ev.gzipPrSize ?? ev.prSize)}
                </td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}

function PackagesPanel({
  repoId,
  repository,
  onPackageCountChange,
}: {
  repoId: string;
  repository: Repository | undefined;
  onPackageCountChange?: (count: number) => void;
}) {
  const queryClient = useQueryClient();
  const expandedId = useSignal<string | null>(null);

  const packagesQuery = useQuery({
    queryKey: ["repositories", repoId, "packages"],
    queryFn: () => listPackages(repoId),
    enabled: Boolean(repoId),
  });

  const evolutionsQuery = useQuery({
    queryKey: ["repositories", repoId, "packages", expandedId.value, "evolutions"],
    queryFn: () => getPackageEvolutions(repoId, expandedId.value as string),
    enabled: Boolean(repoId && expandedId.value),
  });

  const removePackageMutation = useMutation({
    mutationFn: (packageId: string) => deletePackage(repoId, packageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories", repoId, "packages"] });
    },
  });

  useEffect(() => {
    onPackageCountChange?.((packagesQuery.data ?? []).length);
  }, [packagesQuery.data, onPackageCountChange]);

  function handleExpand(packageId: string) {
    if (expandedId.value === packageId) {
      expandedId.value = null;
      return;
    }
    expandedId.value = packageId;
  }

  return (
    <section
      class="rounded-xl border border-neutral-800 overflow-hidden"
      style="background: #111113;"
    >
      <div class="px-5 py-4 border-b border-neutral-800/60">
        <h2 class="text-xs font-mono text-neutral-500 uppercase tracking-wider">Packages</h2>
        <p class="text-xs text-neutral-700 mt-1">
          Registered automatically when the GitHub Action reports bundle sizes.
        </p>
      </div>

      {packagesQuery.isLoading ? (
        <div class="py-10 text-center">
          <span class="font-mono text-xs text-neutral-600">Loading…</span>
        </div>
      ) : (packagesQuery.data ?? []).length === 0 ? (
        <div class="py-10 px-5 text-center">
          <p class="font-mono text-xs text-neutral-700">No packages tracked yet.</p>
          <p class="font-mono text-xs text-neutral-800 mt-1">
            Set up the GitHub Action to start collecting data.
          </p>
        </div>
      ) : (
        <ul class="divide-y divide-neutral-800/60">
          {(packagesQuery.data ?? []).map((pkg) => (
            <li key={pkg.id} class="px-5">
              <div class="flex items-center justify-between py-3.5">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-white font-mono">{pkg.name}</p>
                  {pkg.path && <p class="font-mono text-xs text-neutral-600 mt-0.5">{pkg.path}</p>}
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => handleExpand(pkg.id)}>
                    {expandedId.value === pkg.id ? "Hide" : "History"}
                  </Button>
                  <Button
                    variant="danger-icon"
                    onClick={async () => {
                      if (confirm(`Delete package "${pkg.name}" and all its data?`)) {
                        await removePackageMutation.mutateAsync(pkg.id);
                        if (expandedId.value === pkg.id) expandedId.value = null;
                      }
                    }}
                    title="Delete package"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width={1.5}
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

              {expandedId.value === pkg.id && (
                <div class="pb-4 space-y-3">
                  {evolutionsQuery.isLoading ? (
                    <div
                      class="rounded-lg border border-neutral-800/60 p-4"
                      style="background: rgba(0,0,0,0.2);"
                    >
                      <p class="font-mono text-xs text-neutral-600">Loading history…</p>
                    </div>
                  ) : evolutionsQuery.error ? (
                    <div
                      class="rounded-lg border border-neutral-800/60 p-4"
                      style="background: rgba(0,0,0,0.2);"
                    >
                      <p class="font-mono text-xs text-red-400">
                        {evolutionsQuery.error instanceof Error
                          ? evolutionsQuery.error.message
                          : "Failed to load evolutions"}
                      </p>
                    </div>
                  ) : (
                    <>
                      {(evolutionsQuery.data?.evolutions ?? []).some((ev) => ev.prMerged) && (
                        <div
                          class="rounded-lg border border-neutral-800/60 p-4"
                          style="background: rgba(0,0,0,0.2);"
                        >
                          <BundleSizeChart evolutions={evolutionsQuery.data?.evolutions ?? []} />
                        </div>
                      )}
                      <div
                        class="rounded-lg border border-neutral-800/60 p-4"
                        style="background: rgba(0,0,0,0.2);"
                      >
                        <EvolutionsTable
                          evolutions={evolutionsQuery.data?.evolutions ?? []}
                          repository={repository}
                          repoId={repoId}
                          packageId={pkg.id}
                        />
                      </div>
                    </>
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
  const actionFilesModalOpen = useSignal(false);
  const setupExpanded = useSignal(true);
  const setupAutoCollapsed = useSignal(false);
  const packageCount = useSignal(0);

  const repoId = params.id as string;

  const repositoriesQuery = useQuery({
    queryKey: ["repositories"],
    queryFn: listRepositories,
    enabled: auth.authenticated.value,
  });

  const repository: Repository | undefined = (repositoriesQuery.data ?? []).find(
    (r) => r.id === repoId,
  );

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
      }
    });
  }, []);

  function handlePackageCountChange(count: number) {
    packageCount.value = count;
    if (count > 0 && !setupAutoCollapsed.value) {
      setupExpanded.value = false;
      setupAutoCollapsed.value = true;
    }
  }

  if (auth.loading.value || repositoriesQuery.isLoading) {
    return (
      <div class="min-h-screen bg-neutral-950 pt-14 flex items-center justify-center">
        <span class="font-mono text-xs text-neutral-600">Loading…</span>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-neutral-950 pt-14">
      <ActionFilesModal
        open={actionFilesModalOpen.value}
        onClose={() => (actionFilesModalOpen.value = false)}
      />
      <div class="max-w-3xl mx-auto px-6 py-10 space-y-5">
        {/* Breadcrumb */}
        <div class="flex items-center gap-2 font-mono text-xs text-neutral-600">
          <button
            onClick={() => route("/dashboard")}
            class="hover:text-neutral-300 transition-colors"
          >
            repositories
          </button>
          <span>/</span>
          <span class="text-neutral-400">
            {repository ? `${repository.owner}/${repository.name}` : repoId}
          </span>
        </div>

        <PackagesPanel
          repoId={repoId}
          repository={repository}
          onPackageCountChange={handlePackageCountChange}
        />
        <ApiKeysPanel repoId={repoId} />

        {/* Setup instructions */}
        <section
          class="rounded-xl border border-neutral-800 overflow-hidden"
          style="background: #111113;"
        >
          <div class="px-5 py-4 border-b border-neutral-800/60 flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xs font-mono text-neutral-500 uppercase tracking-wider">
                GitHub Action setup
              </h2>
              <p class="text-xs text-neutral-700 mt-1">
                Store your API key as a GitHub secret named{" "}
                <code class="font-mono text-neutral-500 bg-neutral-800/60 px-1 rounded">
                  BORIS_API_KEY
                </code>
                .
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              {packageCount.value > 0 && (
                <span class="font-mono text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  installed
                </span>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => (actionFilesModalOpen.value = true)}
              >
                Copy action files
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => (setupExpanded.value = !setupExpanded.value)}
              >
                {setupExpanded.value ? "Hide" : "Show"}
              </Button>
            </div>
          </div>
          {setupExpanded.value && <div class="p-5">
            <p class="font-mono text-xs text-neutral-700 mb-3">
              Add the action files to your repo (button above), then reference the local action in
              your workflow.
            </p>
            <pre
              class="rounded-lg border border-neutral-800/60 p-4 text-xs text-neutral-400 overflow-x-auto font-mono leading-relaxed"
              style="background: rgba(0,0,0,0.3);"
            >{`name: Boris Bundle Tracker
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Collect sizes & report to Boris
        uses: ./.github/actions/boris-bundle-tracker
        with:
          api-key: \${{ secrets.BORIS_API_KEY }}
          # Optional:
           # base-branch: main
           # working-directory: .
           # install-command: npm ci
           # build-command: npm run build`}</pre>
          </div>}
        </section>
      </div>
    </div>
  );
}
