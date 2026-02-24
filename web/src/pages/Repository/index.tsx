import { useEffect } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso";
import { useModel, useSignal } from "@preact/signals";
import { useQuery } from "@tanstack/react-query";
import { AuthModel } from "../../models/auth";
import { listPackages, listRepositories } from "../../lib/api";
import type { Repository } from "../../lib/api";
import { ActionFilesModal } from "./components/ActionFilesModal";
import { PackagesPanel } from "./components/PackagesPanel";
import { ApiKeysPanel } from "./components/ApiKeysPanel";
import { SetupInstructionsPanel } from "./components/SetupInstructionsPanel";

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

  const packagesCountQuery = useQuery({
    queryKey: ["repositories", repoId, "packages"],
    queryFn: () => listPackages(repoId),
    enabled: Boolean(repoId),
  });

  const repository: Repository | undefined = (repositoriesQuery.data ?? []).find(
    (item) => item.id === repoId,
  );

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
      }
    });
  }, []);

  useEffect(() => {
    const count = (packagesCountQuery.data ?? []).length;
    if (packageCount.value !== count) {
      packageCount.value = count;
    }
    if (count > 0 && !setupAutoCollapsed.value) {
      setupExpanded.value = false;
      setupAutoCollapsed.value = true;
    }
  }, [packagesCountQuery.data?.length]);

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
        <div class="flex items-center gap-2 font-mono text-xs text-neutral-600">
          <button onClick={() => route("/dashboard")} class="hover:text-neutral-300 transition-colors">
            repositories
          </button>
          <span>/</span>
          <span class="text-neutral-400">{repository ? `${repository.owner}/${repository.name}` : repoId}</span>
        </div>

        <PackagesPanel repoId={repoId} repository={repository} />
        <ApiKeysPanel repoId={repoId} />
        <SetupInstructionsPanel
          packageCount={packageCount.value}
          setupExpanded={setupExpanded.value}
          onOpenActionFilesModal={() => (actionFilesModalOpen.value = true)}
          onToggleExpanded={() => (setupExpanded.value = !setupExpanded.value)}
        />
      </div>
    </div>
  );
}
