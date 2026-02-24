import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthModel } from "../../models/auth";
import { addRepository, listRepositories, removeRepository } from "../../lib/api";
import { useModel, useSignal } from "@preact/signals";
import { AddRepositoryCard } from "./components/AddRepositoryCard";
import { RepositoriesPanel } from "./components/RepositoriesPanel";
import { parseRepoInput } from "./components/dashboardUtils";

export function Dashboard() {
  const { route } = useLocation();
  const auth = useModel(AuthModel);
  const queryClient = useQueryClient();

  const reposQuery = useQuery({
    queryKey: ["repositories"],
    queryFn: listRepositories,
    enabled: auth.authenticated.value,
  });

  const addRepoMutation = useMutation({
    mutationFn: ({ owner, name }: { owner: string; name: string }) => addRepository(owner, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
    },
  });

  const removeRepoMutation = useMutation({
    mutationFn: (id: string) => removeRepository(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
    },
  });

  const addInput = useSignal("");
  const addError = useSignal<string | null>(null);
  const addLoading = useSignal(false);

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
      }
    });
  }, []);

  if (auth.loading.value) {
    return (
      <div class="min-h-screen bg-neutral-950 pt-14 flex items-center justify-center">
        <span class="font-mono text-xs text-neutral-600">loading...</span>
      </div>
    );
  }

  async function handleAddRepo(e: Event) {
    e.preventDefault();
    addError.value = null;
    const parsed = parseRepoInput(addInput.value);
    if (!parsed) {
      addError.value = 'Enter a repository as "owner/name", e.g. "acme/my-app"';
      return;
    }
    addLoading.value = true;
    try {
      await addRepoMutation.mutateAsync(parsed);
      addInput.value = "";
    } catch (err) {
      addError.value = err instanceof Error ? err.message : "Failed to add repository";
    } finally {
      addLoading.value = false;
    }
  }

  return (
    <div class="min-h-screen bg-neutral-950 pt-14">
      <div class="max-w-3xl mx-auto px-6 py-10">
        {/* Page header */}
        <div class="mb-8">
          <p class="font-mono text-xs text-orange-500 tracking-widest uppercase mb-2">Dashboard</p>
          <h1 class="text-2xl font-bold text-white">Repositories</h1>
          <p class="text-sm text-neutral-600 mt-1">
            Track bundle-size evolution across your GitHub repositories.
          </p>
        </div>

        <AddRepositoryCard
          inputValue={addInput.value}
          loading={addLoading.value}
          error={addError.value}
          onSubmit={handleAddRepo}
          onInput={(value) => (addInput.value = value)}
        />

        <RepositoriesPanel
          repositories={reposQuery.data ?? []}
          loading={reposQuery.isLoading}
          error={
            reposQuery.error instanceof Error ? reposQuery.error.message : reposQuery.error ? "Failed to load repositories" : null
          }
          onOpen={(repositoryId) => route(`/repository/${repositoryId}`)}
          onRemove={async (repo) => {
            if (confirm(`Remove ${repo.owner}/${repo.name}?`)) {
              await removeRepoMutation.mutateAsync(repo.id);
            }
          }}
        />
      </div>
    </div>
  );
}
