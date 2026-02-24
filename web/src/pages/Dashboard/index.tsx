import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthModel } from "../../models/auth";
import { addRepository, listRepositories, removeRepository } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useModel, useSignal } from "@preact/signals";

/** Format "owner/name" from two separate fields. */
function parseRepoInput(raw: string): { owner: string; name: string } | null {
  const parts = raw.trim().split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { owner: parts[0].trim(), name: parts[1].trim() };
}

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

        {/* Add repository */}
        <div class="rounded-xl border border-neutral-800 p-5 mb-5" style="background: #111113;">
          <h2 class="text-xs font-mono text-neutral-500 uppercase tracking-wider mb-3">
            Add repository
          </h2>
          <form onSubmit={handleAddRepo} class="flex gap-2">
            <Input
              type="text"
              placeholder="owner/repo"
              value={addInput.value}
              onInput={(e) => (addInput.value = (e.target as HTMLInputElement).value)}
              class="flex-1"
            />
            <Button type="submit" size="sm" disabled={!addInput.value.trim() || addLoading.value}>
              {addLoading.value ? "Adding…" : "Add"}
            </Button>
          </form>
          {addError.value && <p class="font-mono text-xs text-red-400 mt-2">{addError.value}</p>}
        </div>

        {/* Repository list */}
        <div
          class="rounded-xl border border-neutral-800 overflow-hidden"
          style="background: #111113;"
        >
          <div class="flex items-center justify-between px-5 py-4 border-b border-neutral-800/60">
            <h2 class="text-xs font-mono text-neutral-500 uppercase tracking-wider">
              Tracked repositories
            </h2>
            <span class="font-mono text-xs text-neutral-600">
              {(reposQuery.data ?? []).length} linked
            </span>
          </div>

          {reposQuery.isLoading ? (
            <div class="py-10 text-center">
              <span class="font-mono text-xs text-neutral-600">loading…</span>
            </div>
          ) : reposQuery.error ? (
            <div class="py-10 text-center">
              <span class="font-mono text-xs text-red-400">
                {reposQuery.error instanceof Error
                  ? reposQuery.error.message
                  : "Failed to load repositories"}
              </span>
            </div>
          ) : (reposQuery.data ?? []).length === 0 ? (
            <div class="py-12 text-center px-5">
              <div class="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                <svg
                  class="w-5 h-5 text-neutral-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>
              </div>
              <p class="text-sm text-neutral-600">No repositories yet.</p>
              <p class="text-xs text-neutral-700 mt-1">Add one above to start tracking.</p>
            </div>
          ) : (
            <ul class="divide-y divide-neutral-800/60">
              {(reposQuery.data ?? []).map((repo) => (
                <li
                  key={repo.id}
                  class="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.015] transition-colors group"
                >
                  <button class="text-left min-w-0" onClick={() => route(`/repository/${repo.id}`)}>
                    <span class="text-sm font-mono text-neutral-300 group-hover:text-white transition-colors">
                      <span class="text-neutral-600">{repo.owner}/</span>
                      {repo.name}
                    </span>
                  </button>
                  <div class="flex items-center gap-1 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => route(`/repository/${repo.id}`)}
                    >
                      Open
                    </Button>
                    <Button
                      variant="danger-icon"
                      onClick={async () => {
                        if (confirm(`Remove ${repo.owner}/${repo.name}?`)) {
                          await removeRepoMutation.mutateAsync(repo.id);
                        }
                      }}
                      title="Remove repository"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
