import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../components/ui/Button";
import { deleteEvolution, updateEvolution } from "../../../lib/api";
import type { PackageEvolutionPullRequest, Repository } from "../../../lib/api";
import { diffBadge, SizeCell } from "./sizeUtils";

type EvolutionsTableProps = {
  pullRequests: PackageEvolutionPullRequest[];
  repository: Repository | undefined;
  repoId: string;
  packageId: string;
};

export function EvolutionsTable({
  pullRequests,
  repository,
  repoId,
  packageId,
}: EvolutionsTableProps) {
  const queryClient = useQueryClient();
  const updatingPr = useSignal<number | null>(null);
  const deletingPr = useSignal<number | null>(null);
  const openMenuPr = useSignal<number | null>(null);

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

  if (pullRequests.length === 0) {
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
          {pullRequests.map((pullRequest) => {
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
                              openMenuPr.value = openMenuPr.value === prNumber ? null : prNumber;
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
                                    updatingPr.value === prNumber || deletingPr.value === prNumber
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
                <td class="py-2.5 pr-4 font-mono text-xs text-neutral-500">{evolution.fileName}</td>
                <td class="py-2.5 pr-4 align-top">
                  <SizeCell
                    raw={evolution.mainSize}
                    gzip={evolution.gzipMainSize}
                    brotli={evolution.brotliMainSize}
                  />
                </td>
                <td class="py-2.5 pr-4 align-top">
                  <SizeCell
                    raw={evolution.prSize}
                    gzip={evolution.gzipPrSize}
                    brotli={evolution.brotliPrSize}
                  />
                </td>
                <td class="py-2.5 text-right">
                  {diffBadge(
                    evolution.gzipMainSize ?? evolution.mainSize,
                    evolution.gzipPrSize ?? evolution.prSize,
                  )}
                </td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}
