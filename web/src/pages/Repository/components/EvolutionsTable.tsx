import { useEffect } from "preact/hooks";
import { useSignal, useComputed } from "@preact/signals";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../components/ui/Button";
import { deleteEvolution, updateEvolution } from "../../../lib/api";
import type { PackageEvolution, PackageEvolutionPullRequest, Repository } from "../../../lib/api";
import { diffBadge, SizeCell } from "./sizeUtils";

type CompressionMode = "raw" | "gzip" | "brotli";
type StatusFilter = "all" | "open" | "closed" | "merged";
type SortField = "date" | "delta";
type SortDir = "asc" | "desc";

type EvolutionsTableProps = {
  pullRequests: PackageEvolutionPullRequest[];
  repository: Repository | undefined;
  repoId: string;
  packageId: string;
  /** Compression mode shared with the chart. Controls which sizes the Change column shows. */
  compressionMode?: CompressionMode;
  onCompressionModeChange?: (mode: CompressionMode) => void;
};

function getEvolutionSize(ev: PackageEvolution, mode: CompressionMode): number {
  if (mode === "gzip") return ev.gzipPrSize ?? ev.prSize;
  if (mode === "brotli") return ev.brotliPrSize ?? ev.prSize;
  return ev.prSize;
}

function getEvolutionMainSize(ev: PackageEvolution, mode: CompressionMode): number {
  if (mode === "gzip") return ev.gzipMainSize ?? ev.mainSize;
  if (mode === "brotli") return ev.brotliMainSize ?? ev.mainSize;
  return ev.mainSize;
}

export function EvolutionsTable({
  pullRequests,
  repository,
  repoId,
  packageId,
  compressionMode: externalMode,
  onCompressionModeChange,
}: EvolutionsTableProps) {
  const internalMode = useSignal<CompressionMode>("gzip");
  const activeMode = externalMode ?? internalMode.value;

  function setMode(m: CompressionMode) {
    if (onCompressionModeChange) {
      onCompressionModeChange(m);
    } else {
      internalMode.value = m;
    }
  }
  const queryClient = useQueryClient();
  const updatingPr = useSignal<number | null>(null);
  const deletingPr = useSignal<number | null>(null);
  const openMenuPr = useSignal<number | null>(null);

  // Filter / sort state
  const statusFilter = useSignal<StatusFilter>("all");
  const sortField = useSignal<SortField>("date");
  const sortDir = useSignal<SortDir>("desc");
  const searchQuery = useSignal("");

  const markMergedMutation = useMutation({
    mutationFn: (prNumber: number) =>
      updateEvolution(repoId, packageId, prNumber, { prMerged: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["repositories", repoId, "packages", packageId, "evolutions"],
      });
    },
  });

  const deleteEvolutionMutation = useMutation({
    mutationFn: (prNumber: number) => deleteEvolution(repoId, packageId, prNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["repositories", repoId, "packages", packageId, "evolutions"],
      });
    },
  });

  async function handleMarkMerged(prNumber: number) {
    openMenuPr.value = null;
    updatingPr.value = prNumber;
    try {
      await markMergedMutation.mutateAsync(prNumber);
    } catch (error) {
      console.error(error);
      alert("Failed to mark as merged");
    } finally {
      updatingPr.value = null;
    }
  }

  async function handleDeleteEvolution(prNumber: number) {
    if (!confirm(`Delete all evolution entries for PR #${prNumber}?`)) return;

    openMenuPr.value = null;
    deletingPr.value = prNumber;
    try {
      await deleteEvolutionMutation.mutateAsync(prNumber);
    } catch (error) {
      console.error(error);
      alert("Failed to delete PR history");
    } finally {
      deletingPr.value = null;
    }
  }

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("[data-pr-actions-menu]")) {
        openMenuPr.value = null;
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  /** Total delta for a pull request using the active compression mode. */
  function prDelta(pr: PackageEvolutionPullRequest): number {
    return pr.evolutions.reduce(
      (acc, ev) => acc + getEvolutionSize(ev, activeMode) - getEvolutionMainSize(ev, activeMode),
      0,
    );
  }

  const filteredAndSorted = useComputed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    let result = pullRequests.filter((pr) => {
      // Status filter
      if (statusFilter.value === "merged" && !pr.prMerged) return false;
      if (statusFilter.value === "closed" && (pr.prMerged || pr.prState !== "closed")) return false;
      if (statusFilter.value === "open" && (pr.prMerged || pr.prState !== "open")) return false;

      // Title search
      if (q && !(pr.prTitle?.toLowerCase().includes(q) || String(pr.prNumber).includes(q))) {
        return false;
      }

      return true;
    });

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField.value === "date") {
        cmp = new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime();
      } else {
        cmp = prDelta(a) - prDelta(b);
      }
      return sortDir.value === "asc" ? cmp : -cmp;
    });

    return result;
  });

  function toggleSort(field: SortField) {
    if (sortField.value === field) {
      sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
    } else {
      sortField.value = field;
      sortDir.value = "desc";
    }
  }

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField.value !== field) return <span class="text-neutral-800 ml-1">↕</span>;
    return <span class="text-orange-500 ml-1">{sortDir.value === "asc" ? "↑" : "↓"}</span>;
  };

  if (pullRequests.length === 0) {
    return (
      <p class="font-mono text-xs text-neutral-700 text-center py-5">
        No data yet. Run the GitHub Action on a pull request to see results.
      </p>
    );
  }

  return (
    <div class="space-y-3">
      {/* Filter / search toolbar */}
      <div class="flex flex-wrap items-center gap-2">
        {/* Search box */}
        <input
          type="text"
          placeholder="Search PR title or #"
          value={searchQuery.value}
          onInput={(e) => (searchQuery.value = (e.target as HTMLInputElement).value)}
          class="flex-1 min-w-[140px] rounded border border-neutral-800 bg-neutral-900/60 px-2 py-1 font-mono text-xs text-neutral-300 placeholder-neutral-700 outline-none focus:border-neutral-600"
        />

        {/* Status filter chips */}
        <div class="flex gap-1">
          {(["all", "open", "closed", "merged"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => (statusFilter.value = s)}
              class={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition-colors ${
                statusFilter.value === s
                  ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                  : "text-neutral-700 hover:text-neutral-400 border-transparent"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div class="-mx-5 px-5 overflow-visible">
        <table class="w-full text-sm">
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
                <div class="flex items-center justify-end gap-1.5">
                  {/* Compression mode toggle (links to chart toggle) */}
                  {(["raw", "gzip", "brotli"] as CompressionMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMode(m);
                      }}
                      class={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border transition-colors ${
                        activeMode === m
                          ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                          : "text-neutral-800 hover:text-neutral-500 border-transparent"
                      }`}
                    >
                      {m === "gzip" ? "gz" : m === "brotli" ? "br" : "raw"}
                    </button>
                  ))}
                  <span
                    class="cursor-pointer select-none hover:text-neutral-400 transition-colors"
                    onClick={() => toggleSort("delta")}
                  >
                    Change
                    <SortIndicator field="delta" />
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-800/40">
            {filteredAndSorted.value.length === 0 ? (
              <tr>
                <td colSpan={6} class="py-5 text-center font-mono text-xs text-neutral-700">
                  No pull requests match the current filters.
                </td>
              </tr>
            ) : (
              filteredAndSorted.value.map((pullRequest) => {
                const { prNumber, prTitle, prMerged, prState, evolutions } = pullRequest;
                const prUrl = repository
                  ? `https://github.com/${repository.owner}/${repository.name}/pull/${prNumber}`
                  : `#${prNumber}`;

                return evolutions.map((evolution, index) => (
                  <tr key={evolution.id}>
                    {index === 0 && (
                      <>
                        <td class="py-2.5 pr-4 align-top" rowSpan={evolutions.length}>
                          <a
                            href={prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="font-mono text-xs text-orange-500 hover:text-orange-400 transition-colors"
                          >
                            #{prNumber}
                          </a>
                          {prTitle && (
                            <p class="text-xs text-neutral-600 mt-0.5 max-w-[10rem] truncate">
                              {prTitle}
                            </p>
                          )}
                        </td>
                        <td class="py-2.5 pr-4 align-top" rowSpan={evolutions.length}>
                          <div class="flex items-center gap-2">
                            {prMerged ? (
                              <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                                merged
                              </span>
                            ) : prState === "closed" ? (
                              <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500">
                                closed
                              </span>
                            ) : (
                              <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                                open
                              </span>
                            )}
                            <div class="relative" data-pr-actions-menu>
                              <button
                                type="button"
                                class="cursor-pointer select-none rounded px-2 py-0.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/70 font-mono text-xs"
                                onClick={() => {
                                  openMenuPr.value =
                                    openMenuPr.value === prNumber ? null : prNumber;
                                }}
                                aria-label={`Open actions for PR #${prNumber}`}
                              >
                                ...
                              </button>
                              {openMenuPr.value === prNumber && (
                                <div class="absolute top-6 right-0 z-10 min-w-[10rem] rounded border border-neutral-700 bg-neutral-950/95 p-1.5 shadow-xl backdrop-blur">
                                  {!prMerged && prState !== "closed" && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      class="w-full px-2 py-1 text-left font-mono text-[11px] text-emerald-300 hover:bg-emerald-500/10"
                                      onClick={() => handleMarkMerged(prNumber)}
                                      disabled={
                                        updatingPr.value === prNumber ||
                                        deletingPr.value === prNumber
                                      }
                                    >
                                      {updatingPr.value === prNumber
                                        ? "Marking as merged..."
                                        : "Mark as merged"}
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    class="w-full px-2 py-1 text-left font-mono text-[11px] text-rose-300 hover:bg-rose-500/10"
                                    onClick={() => handleDeleteEvolution(prNumber)}
                                    disabled={
                                      deletingPr.value === prNumber || updatingPr.value === prNumber
                                    }
                                  >
                                    {deletingPr.value === prNumber
                                      ? "Deleting..."
                                      : "Delete PR history"}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </>
                    )}
                    <td class="py-2.5 pr-4 font-mono text-xs text-neutral-500">
                      {evolution.fileName}
                    </td>
                    <td class="py-2.5 pr-4 align-top text-right">
                      <SizeCell
                        raw={evolution.mainSize}
                        gzip={evolution.gzipMainSize}
                        brotli={evolution.brotliMainSize}
                      />
                    </td>
                    <td class="py-2.5 pr-4 align-top text-right">
                      <SizeCell
                        raw={evolution.prSize}
                        gzip={evolution.gzipPrSize}
                        brotli={evolution.brotliPrSize}
                      />
                    </td>
                    <td class="py-2.5 text-right">
                      {diffBadge(
                        getEvolutionMainSize(evolution, activeMode),
                        getEvolutionSize(evolution, activeMode),
                      )}
                    </td>
                  </tr>
                ));
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
