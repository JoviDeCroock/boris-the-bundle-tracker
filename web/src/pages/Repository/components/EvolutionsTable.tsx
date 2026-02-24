import { useMemo } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../components/ui/Button";
import { updateEvolution } from "../../../lib/api";
import type { PackageEvolution, Repository } from "../../../lib/api";
import { diffBadge, SizeCell } from "./sizeUtils";

type EvolutionsTableProps = {
  evolutions: PackageEvolution[];
  repository: Repository | undefined;
  repoId: string;
  packageId: string;
};

export function EvolutionsTable({ evolutions, repository, repoId, packageId }: EvolutionsTableProps) {
  const safeEvolutions = evolutions.filter((ev): ev is PackageEvolution => Boolean(ev && ev.id));

  const byPr = useMemo(() => {
    const grouped = new Map<number, Map<string, PackageEvolution>>();
    for (const evolution of safeEvolutions) {
      const key = `${evolution.exportPath}::${evolution.fileName}`;
      const files = grouped.get(evolution.prNumber) ?? new Map<string, PackageEvolution>();
      const existing = files.get(key);
      if (
        !existing ||
        new Date(evolution.reportedAt).getTime() > new Date(existing.reportedAt).getTime()
      ) {
        files.set(key, evolution);
      }
      grouped.set(evolution.prNumber, files);
    }
    return grouped;
  }, [safeEvolutions]);

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
    } catch (error) {
      console.error(error);
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
            <th class="pb-2 pr-4 font-mono text-[10px] uppercase tracking-widest text-neutral-600 font-normal">PR</th>
            <th class="pb-2 pr-4 font-mono text-[10px] uppercase tracking-widest text-neutral-600 font-normal">
              Status
            </th>
            <th class="pb-2 pr-4 font-mono text-[10px] uppercase tracking-widest text-neutral-600 font-normal">File</th>
            <th class="pb-2 pr-4 font-mono text-[10px] uppercase tracking-widest text-neutral-600 font-normal text-right">
              Main
            </th>
            <th class="pb-2 pr-4 font-mono text-[10px] uppercase tracking-widest text-neutral-600 font-normal text-right">PR</th>
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

            return entries.map((evolution, index) => (
              <tr key={evolution.id}>
                {index === 0 && (
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
                      {evolution.prTitle && (
                        <p class="text-xs text-neutral-600 mt-0.5 max-w-[10rem] truncate">{evolution.prTitle}</p>
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
                <td class="py-2.5 pr-4 font-mono text-xs text-neutral-500">{evolution.fileName}</td>
                <td class="py-2.5 pr-4 align-top">
                  <SizeCell raw={evolution.mainSize} gzip={evolution.gzipMainSize} brotli={evolution.brotliMainSize} />
                </td>
                <td class="py-2.5 pr-4 align-top">
                  <SizeCell raw={evolution.prSize} gzip={evolution.gzipPrSize} brotli={evolution.brotliPrSize} />
                </td>
                <td class="py-2.5 text-right">
                  {diffBadge(evolution.gzipMainSize ?? evolution.mainSize, evolution.gzipPrSize ?? evolution.prSize)}
                </td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}
