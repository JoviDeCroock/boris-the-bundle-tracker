import { useSignal } from "@preact/signals";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../components/ui/Button";
import { BundleSizeChart } from "../../../components/BundleSizeChart";
import { deletePackage, getPackageEvolutions, listPackages } from "../../../lib/api";
import type { Repository } from "../../../lib/api";
import { EvolutionsTable } from "./EvolutionsTable";

type PackagesPanelProps = {
  repoId: string;
  repository: Repository | undefined;
};

export function PackagesPanel({ repoId, repository }: PackagesPanelProps) {
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
                      {(evolutionsQuery.data?.pullRequests ?? []).some(
                        (pullRequest) => pullRequest.prMerged,
                      ) && (
                        <div
                          class="rounded-lg border border-neutral-800/60 p-4"
                          style="background: rgba(0,0,0,0.2);"
                        >
                          <BundleSizeChart
                            evolutions={(evolutionsQuery.data?.pullRequests ?? []).flatMap(
                              (pullRequest) => pullRequest.evolutions,
                            )}
                          />
                        </div>
                      )}
                      <div
                        class="rounded-lg border border-neutral-800/60 p-4"
                        style="background: rgba(0,0,0,0.2);"
                      >
                        <EvolutionsTable
                          pullRequests={evolutionsQuery.data?.pullRequests ?? []}
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
